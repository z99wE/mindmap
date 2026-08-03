const { keyPool } = require('./key-pool');
const { decrypt } = require('./crypto');

// Call a specific LLM provider
async function callProvider(provider, apiKey, systemPrompt, message) {
  const endpoints = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    ollama: 'http://localhost:11434/v1/chat/completions',
    lmstudio: 'http://localhost:1234/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
  };

  const models = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    openrouter: 'meta-llama/llama-3.3-70b-instruct',
    ollama: 'llama3',
    lmstudio: 'meta-llama-3-8b-instruct',
    anthropic: 'claude-3-5-haiku-latest',
  };

  const endpoint = endpoints[provider];
  const model = models[provider];
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

  let headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://thoughtgps.local';
    headers['X-Title'] = 'Thought GPS';
  }

  let body;
  if (provider === 'anthropic') {
    body = JSON.stringify({
      model,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });
  } else {
    body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  if (provider === 'anthropic') {
    return data.content?.[0]?.text || 'No response generated.';
  }
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

// Orchestrates the LLM call checking user keys then falling back to shared keys
async function callLLM(user, message, relatedMemories, intent, liveContext = [], localMemories = []) {
  const contextStr = relatedMemories.length > 0
    ? `\n\nRelated memories:\n${relatedMemories.map(m => `- ${m.content}`).join('\n')}`
    : '';
  const localStr = localMemories.length > 0
    ? `\n\nAdditional historical memories (Synced locally from user backup):\n${localMemories.map(m => `- [${m.category || 'Memory'}] ${m.value || m.content || m}`).join('\n')}`
    : '';
  const liveStr = liveContext.length > 0
    ? `\n\nLive web context (Real-time live information):\n${liveContext.slice(0, 3).map(r => `- [${r.source}] ${r.content}`).join('\n')}`
    : '';

  const systemPrompt = `You are Thought GPS, a cognitive coprocessor for ADHD/neurodiverse users.
You help organize thoughts, track commitments, detect patterns, and navigate cognitive load.
Current intent: ${intent}.${contextStr}${localStr}${liveStr}
${liveContext.length > 0 ? '\nIMPORTANT: Real-time search results are provided above. Prioritize this live web context for any current news, status, or date-sensitive facts. Do NOT output outdated facts if the live context contains fresh information.\n' : ''}
Be concise, empathetic, and action-oriented. Format key items as bullet points.`;

  // Try BYO keys first (all tiers)
  const byoKeys = user.api_keys || {};

  for (const [provider, keyData] of Object.entries(byoKeys)) {
    if (keyData?.key) {
      try {
        const decryptedKey = decrypt(keyData.key);
        return await callProvider(provider, decryptedKey, systemPrompt, message);
      } catch (e) {
        console.log(`[LLM] BYO ${provider} failed: ${e.message}`);
      }
    }
  }

  // Free tier: require BYO keys, no shared pool
  if (user.tier === 'free') {
    return 'Your thought has been saved! To get AI-powered responses, add your API key (Groq is free) in Mission Control > API Keys. Your message is stored and will be enriched once a key is configured.';
  }

  // Pro/Managed: Fall back to shared pool as emergency backup
  const sharedKey = keyPool.getNextKey('groq') || keyPool.getNextKey('openai');
  if (!sharedKey) {
    return 'Your thought has been saved. LLM services are temporarily unavailable. Your message has been stored for later enrichment.';
  }

  try {
    return await callProvider(sharedKey.provider, sharedKey.key, systemPrompt, message);
  } catch (e) {
    if (e.message.includes('429') || e.message.includes('rate')) {
      keyPool.markCoolingDown(sharedKey.id);
      const nextKey = keyPool.getNextKey(sharedKey.provider);
      if (nextKey) {
        try {
          return await callProvider(nextKey.provider, nextKey.key, systemPrompt, message);
        } catch { /* fall through */ }
      }
    }
    return 'I captured your thought in memory. LLM processing is temporarily unavailable.';
  }
}

module.exports = { callLLM, callProvider };
