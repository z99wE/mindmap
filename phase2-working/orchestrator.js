/**
 * AGENT ORCHESTRATOR (LangGraph-style DAG execution)
 * Wires real LLM calls, memory graph, embeddings, and Agent Reach enrichment.
 * 
 * Pipeline: parse_input → check_memory → enrich_context → process_llm → update_memory → send_response
 */

const { MemoryGraphManager, EmbeddingGenerator, knowledgeExtractor } = require('./memory-graph');
const { KeyPool } = require('./src/key-pool');
const { traceLLM, traceSpan } = require('./src/thought-tracer');
const { classifyHalfLife } = require('./features/thought-half-life');
const { detectCommitment } = require('./features/commitment-witness');
const { detectIntent, detectUnanchored, applyRevivalHours, scheduleRevival } = require('./features/thought-interceptor');
const { inferClassification } = require('./features/thought-classification');

// ============================================
// 1. WORKFLOW NODE
// ============================================

class WorkflowNode {
  constructor(name, handler) {
    this.name = name;
    this.handler = handler;
    this.next = [];
  }

  addNext(node) {
    this.next.push(node);
    return this;
  }

  async execute(state) {
    console.log(`📊 Orchestrator node: ${this.name}`);
    const start = Date.now();
    try {
      const result = await this.handler(state);
      state.nodeTimings = state.nodeTimings || {};
      state.nodeTimings[this.name] = Date.now() - start;
      return result;
    } catch (err) {
      console.error(`❌ Node ${this.name} failed:`, err.message);
      return { error: err.message, failedNode: this.name };
    }
  }
}

// ============================================
// 2. ORCHESTRATOR STATE
// ============================================

class OrchestratorState {
  constructor(userId, input, user = null) {
    this.userId = userId;
    this.input = input;
    this.user = user; // Full user object with tier, isAdmin, etc.
    this.context = {};
    this.memory = [];
    this.results = {};
    this.currentNode = null;
    this.nodeTimings = {};
    this.parsedInput = null;
    this.relatedMemories = [];
    this.webContext = [];
    this.llmResponse = null;
    this.finalResponse = null;
    this.completed = false;
    this.error = null;
  }
}

// ============================================
// 3. ORCHESTRATOR
// ============================================

class Orchestrator {
  constructor(pool, keyPool) {
    this.nodes = new Map();
    this.startNode = null;
    this.endNodes = [];
    this.pool = pool;
    this.keyPool = keyPool;
    this.memoryManager = new MemoryGraphManager(pool);
    this.embedder = new EmbeddingGenerator();
  }

  addNode(name, handler) {
    const node = new WorkflowNode(name, handler);
    this.nodes.set(name, node);
    if (!this.startNode) this.startNode = node;
    return node;
  }

  connect(fromName, toName) {
    const fromNode = this.nodes.get(fromName);
    const toNode = this.nodes.get(toName);
    if (fromNode && toNode) fromNode.addNext(toNode);
    return this;
  }

  setEndNode(name) {
    this.endNodes.push(name);
  }

  async run(initialState) {
    let state = initialState;
    let currentNode = this.startNode;

    while (currentNode) {
      state.currentNode = currentNode.name;
      const result = await currentNode.execute(state);

      if (result.error) {
        state.error = result.error;
        state.failedNode = result.failedNode;
        break;
      }

      state = { ...state, ...result };

      if (currentNode.next.length > 0) {
        currentNode = currentNode.next[0];
      } else {
        break;
      }
    }

    return state;
  }

  /**
   * Build the full cognitive pipeline with real LLM + memory
   */
  buildWorkflow() {
    // Node 1: Parse input - classify intent, extract entities
    this.addNode('parse_input', async (state) => {
      const text = state.input;
      const facts = await knowledgeExtractor.extractFacts(text, state.userId);

      // Keyword-based intent classification
      const intent = classifyIntent(text);

      return {
        parsedInput: {
          type: 'text',
          intent: intent.type,
          entities: facts.map(f => ({ entity: f.entity, attribute: f.attribute })),
          category: facts[0]?.category || 'general',
          facts,
        }
      };
    });

    // Node 2: Check memory - semantic search via pgvector
    this.addNode('check_memory', async (state) => {
      const relatedMemories = await this.memoryManager.searchMemories(
        state.userId,
        state.input,
        5
      );

      return {
        relatedMemories: relatedMemories.map(m => ({
          id: m.id,
          value: m.value,
          attribute: m.attribute,
          category: m.category,
          similarity: m.similarity,
        })),
        memoryMatch: relatedMemories.length > 0,
      };
    });

    // Node 3: Enrich context (Agent Reach - optional web search)
    this.addNode('enrich_context', async (state) => {
      const webContext = [];
      // Only fetch web context for queries that need current info
      const needsWeb = /current|latest|news|today|recent|update|now|weather/i.test(state.input);

      if (needsWeb && state.user?.tier === 'premium') {
        try {
          const { liveInfoSystem } = require('./agent-reach-integration');
          const results = await liveInfoSystem.searchWeb(state.input);
          if (results?.results?.length) {
            webContext.push(...results.results.slice(0, 3));
          }
        } catch {
          // Agent Reach optional, don't fail pipeline
        }
      }

      return { webContext };
    });

    // Node 4: Process with LLM - real Groq/OpenAI call via key pool
    this.addNode('process_llm', async (state) => {
      const systemPrompt = buildSystemPrompt(state);
      const userMessage = state.input;

      // Try BYO keys first (premium users)
      let provider = null;
      let apiKey = null;

      if (state.user?.api_keys) {
        const userKeys = state.user.api_keys;
        if (userKeys.groq) { provider = 'groq'; apiKey = userKeys.groq; }
        else if (userKeys.openai) { provider = 'openai'; apiKey = userKeys.openai; }
      }

      // Fall back to shared key pool
      if (!apiKey) {
        const keyData = this.keyPool.getNextKey('groq') || this.keyPool.getNextKey('openai');
        if (keyData) {
          provider = keyData.provider;
          apiKey = keyData.key;
        }
      }

      if (!apiKey) {
        return {
          llmResponse: `I understand your message: "${state.input}"\n\nIntent: ${state.parsedInput?.intent}\n\nNote: No LLM API key available. Configure GROQ_KEY_1 or OPENAI_KEY_1 environment variable.`,
          provider: 'fallback',
        };
      }

      // Make real LLM call
      const response = await callProvider(provider, apiKey, systemPrompt, userMessage);

      if (response.error) {
        // Mark key as cooling if rate limited
        if (response.status === 429) {
          this.keyPool.markCoolingDown(`${provider}_key`);
        }
        return {
          llmResponse: `LLM temporarily unavailable: ${response.error}. Your thought has been recorded.`,
          provider: `${provider}(error)`,
        };
      }

      // Trace to Langfuse
      traceLLM({
        input: userMessage,
        output: response.content,
        model: response.model,
        provider,
        userId: state.userId,
        latencyMs: state.nodeTimings?.process_llm || 0,
        tokens: response.usage,
      });

      return {
        llmResponse: response.content,
        provider,
        model: response.model,
      };
    });

    // Node 5: Update memory - store thought with classifiers
    this.addNode('update_memory', async (state) => {
      // Run half-life classifier
      const halfLife = classifyHalfLife(state.input);
      const expiresAt = new Date(Date.now() + halfLife.half_life_hours * 60 * 60 * 1000).toISOString();

      // Run commitment classifier
      const commitment = detectCommitment(state.input);

      // Run interceptor check
      const intentContent = detectIntent(state.input);
      let unanchored = null;
      if (intentContent) {
        unanchored = detectUnanchored(state.input, intentContent);
        if (unanchored?.is_unanchored) {
          applyRevivalHours(unanchored, halfLife.urgency_tier);
        }
      }

      // Run full cognitive classification (free keyword-based)
      const classification = inferClassification(state.input);
      const cog = classification.cognitive_load || {};
      const themeData = classification.theme_classification || {};

      const extraFields = {
        intent: state.parsedInput?.intent,
        llmResponse: state.llmResponse?.slice(0, 1000),
        halfLifeHours: halfLife.half_life_hours,
        urgencyTier: halfLife.urgency_tier,
        actionVerb: halfLife.action_verb,
        isActionable: halfLife.is_actionable,
        expiresAt,
        status: unanchored?.is_unanchored ? 'pending_clarification' : 'pending',
        cognitiveLoad: cog.load_type,
        brainArea: cog.brain_area,
        emotionalTone: cog.emotional_tone,
        theme: themeData.primary_theme,
        relatedPerson: themeData.mentioned_people?.[0] || null,
      };

      const results = await this.memoryManager.addFact(state.userId, state.input, extraFields);

      // Schedule revival if unanchored
      if (unanchored?.is_unanchored && results[0]?.id) {
        await scheduleRevival(this.pool, state.userId, results[0].id, state.input, unanchored.auto_revival_hours || 12);
      }

      return {
        memoryUpdated: true,
        halfLife,
        commitmentDetected: commitment?.is_commitment ? commitment : null,
        unanchoredResult: unanchored?.is_unanchored ? unanchored : null,
      };
    });

    // Node 6: Send response with classification metadata
    this.addNode('send_response', async (state) => {
      return {
        finalResponse: state.llmResponse,
        completed: true,
        meta: {
          intent: state.parsedInput?.intent,
          category: state.parsedInput?.category,
          relatedMemories: state.relatedMemories?.length || 0,
          webContext: state.webContext?.length || 0,
          provider: state.provider,
          nodeTimings: state.nodeTimings,
          halfLife: state.halfLife || null,
          commitment: state.commitmentDetected || null,
          unanchored: state.unanchoredResult || null,
        }
      };
    });

    // Connect pipeline
    this.connect('parse_input', 'check_memory')
      .connect('check_memory', 'enrich_context')
      .connect('enrich_context', 'process_llm')
      .connect('process_llm', 'update_memory')
      .connect('update_memory', 'send_response');

    this.setEndNode('send_response');
    return this;
  }
}

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function classifyIntent(text) {
  const lower = text.toLowerCase();
  const patterns = {
    task: /\b(remind|todo|task|do|buy|call|schedule|deadline|meeting)\b/,
    question: /\b(what|how|why|when|where|who|which|can you|could you)\b/,
    emotion: /\b(feel|felt|sad|happy|angry|anxious|stressed|worried|excited)\b/,
    commitment: /\b(promise|commit|swear|will do|going to|i'll)\b/,
    reflection: /\b(think|realize|noticed|wonder|maybe|perhaps)\b/,
    location: /\b(at|going to|heading|location|place|arrive|leave|departure)\b/,
  };

  for (const [type, regex] of Object.entries(patterns)) {
    if (regex.test(lower)) return { type, confidence: 0.8 };
  }
  return { type: 'general', confidence: 0.5 };
}

function buildSystemPrompt(state) {
  let prompt = `You are ReMentally, a cognitive coprocessor that helps users organize thoughts, identify patterns, and surface insights.

Your role:
- Analyze the user's input and provide thoughtful, actionable responses
- Reference their memory context when relevant
- Identify emotional undertones and cognitive patterns
- Suggest connections between current thoughts and past memories

Response style: Concise, empathetic, analytical. Use bullet points for clarity.
`;

  // Add memory context
  if (state.relatedMemories?.length > 0) {
    prompt += `\nRelevant memories from this user:\n`;
    state.relatedMemories.slice(0, 3).forEach(m => {
      prompt += `- [${m.category}] ${m.value}\n`;
    });
  }

  // Add web context
  if (state.webContext?.length > 0) {
    prompt += `\nCurrent web context:\n`;
    state.webContext.forEach(w => {
      if (w.title && w.content) prompt += `- ${w.title}: ${w.content.slice(0, 200)}\n`;
    });
  }

  // Add intent-specific instructions
  const intent = state.parsedInput?.intent;
  if (intent === 'emotion') {
    prompt += '\nThe user seems to be expressing emotions. Be empathetic and validating.';
  } else if (intent === 'task') {
    prompt += '\nThe user has a task or action item. Help prioritize and organize.';
  } else if (intent === 'question') {
    prompt += '\nThe user is asking a question. Provide a clear, structured answer.';
  }

  return prompt;
}

async function callProvider(provider, apiKey, systemPrompt, message) {
  const https = require('https');

  const configs = {
    groq: {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 1024,
    },
    openai: {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      model: 'gpt-4o-mini',
      maxTokens: 1024,
    },
  };

  const config = configs[provider] || configs.groq;

  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    max_tokens: config.maxTokens,
    temperature: 0.7,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: config.hostname,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.message?.content) {
            resolve({
              content: parsed.choices[0].message.content,
              model: parsed.model || config.model,
              usage: parsed.usage,
            });
          } else if (parsed.error) {
            resolve({ error: parsed.error.message || 'LLM error', status: res.statusCode });
          } else {
            resolve({ error: 'Unexpected response format', status: res.statusCode });
          }
        } catch {
          resolve({ error: 'Failed to parse LLM response', status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => resolve({ error: err.message }));
    req.setTimeout(30000, () => { req.destroy(); resolve({ error: 'LLM timeout' }); });
    req.write(body);
    req.end();
  });
}

// ============================================
// 5. ORCHESTRATOR MANAGER
// ============================================

class OrchestratorManager {
  constructor(pool, keyPool) {
    this.pool = pool;
    this.keyPool = keyPool;
    this.orchestrators = new Map();
  }

  getOrchestrator(userId) {
    if (!this.orchestrators.has(userId)) {
      this.orchestrators.set(userId, new Orchestrator(this.pool, this.keyPool).buildWorkflow());
    }
    return this.orchestrators.get(userId);
  }

  async runWorkflow(userId, input, user = null) {
    const orchestrator = this.getOrchestrator(userId);
    const state = new OrchestratorState(userId, input, user);
    return await orchestrator.run(state);
  }

	  startAutonomousAgent(pulseKit) {
	    console.log('🤖 Starting background autonomous agent (PicoClaw native loop)...');
	    
	    // Run every 10 minutes in production for free tier safety
	    setInterval(async () => {
	      try {
	        const client = await this.pool.connect();
	        try {
	          // Find users with 3 or more pending items older than 10 minutes
	          const pendingRes = await client.query(
	            `SELECT user_id, COUNT(*) as count 
	             FROM memory_graph 
	             WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes'
	             GROUP BY user_id HAVING COUNT(*) >= 3 LIMIT 10`
	          );
	          
	          if (pendingRes.rows.length === 0) return;
	          
	          console.log(`🧠 [PicoClaw] Found ${pendingRes.rows.length} users needing cognitive organization.`);
	          
	          for (const row of pendingRes.rows) {
	            await this.runPicoClawAgent(row.user_id, client, pulseKit);
	          }
	        } finally {
	          client.release();
	        }
	      } catch (err) {
	        console.error('❌ [PicoClaw] Error in background job:', err.message);
	      }
	    }, 10 * 60 * 1000); // 10 minutes
	  }

	  async runPicoClawAgent(userId, client, pulseKit) {
	    console.log(`⚙️ [PicoClaw] Running agent loop for user ${userId}`);
	    
	    // Tool Registry
	    const tools = {
	      send_message: async ({ message, channel }) => {
	        try {
	          if (!pulseKit) return "Error: Messenger not available";
	          await pulseKit.send({ channel: channel || 'telegram', to: userId, message });
	          return `Sent message to user: ${message}`;
	        } catch (e) {
	          return `Error sending message: ${e.message}`;
	        }
	      },
      consolidate_memories: async ({ ids, new_summary }) => {
        try {
          // Delete old, insert new
          await client.query('DELETE FROM memory_graph WHERE id = ANY($1) AND user_id = $2', [ids, userId]);
          await this.memoryManager.addFact(userId, new_summary, { status: 'consolidated' });
          return `Consolidated ${ids.length} memories into: ${new_summary}`;
        } catch (e) {
          return `Error consolidating: ${e.message}`;
        }
      },
      mark_as_resolved: async ({ ids }) => {
        try {
          await client.query("UPDATE memory_graph SET status = 'resolved' WHERE id = ANY($1) AND user_id = $2", [ids, userId]);
          return `Marked ${ids.length} memories as resolved`;
        } catch (e) {
          return `Error resolving: ${e.message}`;
        }
      }
    };

    const toolDescriptions = `
Available Tools (return JSON with 'action' and 'params'):
1. {"action": "send_message", "params": {"message": "hello", "channel": "telegram"}} - Sends a message to the user.
2. {"action": "consolidate_memories", "params": {"ids": [1, 2], "new_summary": "merged text"}} - Merges multiple related thoughts.
3. {"action": "mark_as_resolved", "params": {"ids": [1, 2]}} - Marks items as resolved.
4. {"action": "done", "params": {}} - Ends the agent loop.
`;

    // Fetch user keys
    const userRes = await client.query('SELECT api_keys FROM users WHERE id = $1', [userId]);
    const userKeys = userRes.rows[0]?.api_keys || {};
    let provider = userKeys.groq ? 'groq' : (userKeys.openai ? 'openai' : null);
    let apiKey = userKeys.groq || userKeys.openai;

    if (!apiKey) {
      const keyData = this.keyPool.getNextKey('groq');
      if (keyData) {
        provider = keyData.provider;
        apiKey = keyData.key;
      }
    }
    if (!apiKey) {
      console.log(`[PicoClaw] Skipping user ${userId} due to missing API key.`);
      return;
    }

    let iterations = 0;
    const maxIterations = 3;
    let contextHistory = [];

    while (iterations < maxIterations) {
      iterations++;
      
      const memories = await client.query(
        "SELECT id, value, created_at FROM memory_graph WHERE status = 'pending' AND user_id = $1 ORDER BY created_at ASC LIMIT 10",
        [userId]
      );
      
      if (memories.rows.length === 0) break;
      const memoryText = memories.rows.map(m => `[ID: ${m.id}] ${m.value}`).join('\n');
      
      const systemPrompt = `You are a background autonomous agent (PicoClaw). Your job is to organize the user's cognitive load.
The user has the following pending thoughts:
${memoryText}

${toolDescriptions}

Execution History:
${contextHistory.length > 0 ? contextHistory.join('\n') : "None"}

Analyze the thoughts. Do they share a theme that can be consolidated? Or is it a bunch of random tasks you should summarize and send to the user?
Respond ONLY with a valid JSON object specifying your action. Do not include markdown code blocks.`;

      const response = await callProvider(provider, apiKey, systemPrompt, "What is your next action? Return JSON only.");
      
      if (response.error) {
        console.error(`[PicoClaw] LLM Error: ${response.error}`);
        break;
      }

      let parsed = null;
      try {
        const cleaned = response.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error(`[PicoClaw] Failed to parse LLM JSON: ${response.content}`);
        break;
      }

      console.log(`[PicoClaw] Loop ${iterations}: ${parsed.action}`);

      if (parsed.action === 'done') break;

      let toolResult = "Unknown action";
      if (tools[parsed.action]) {
        toolResult = await tools[parsed.action](parsed.params || {});
      } else {
        toolResult = `Tool ${parsed.action} not found.`;
      }
      
      contextHistory.push(`Action: ${parsed.action}, Result: ${toolResult}`);
    }
    
    console.log(`✅ [PicoClaw] Finished loop for user ${userId} in ${iterations} iterations.`);
  }
}

// ============================================
// 6. EXPORTS
// ============================================

module.exports = {
  WorkflowNode,
  OrchestratorState,
  Orchestrator,
  OrchestratorManager,
  classifyIntent,
  buildSystemPrompt,
  callProvider,
};
