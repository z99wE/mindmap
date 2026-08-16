const { keyRouter } = require('./key-router');

// Call a specific LLM provider
async function callProvider(provider, apiKey, systemPrompt, message, options = {}) {
  const endpoints = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
    ollama: 'http://localhost:11434/v1/chat/completions',
    lmstudio: 'http://localhost:1234/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    featherless: 'https://api.featherless.ai/v1/chat/completions',
    fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
    lightning: 'https://api.lightning.ai/v1/chat/completions',
  };

  const models = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    openrouter: 'meta-llama/llama-3.3-70b-instruct',
    nvidia: 'meta/llama-3.3-70b-instruct',
    ollama: 'llama3',
    lmstudio: 'meta-llama-3-8b-instruct',
    anthropic: 'claude-3-5-haiku-latest',
    featherless: 'meta-llama/Meta-Llama-3-70B-Instruct',
    fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    lightning: 'meta-llama/Meta-Llama-3-70B-Instruct',
  };

  const endpoint = options.endpoint || endpoints[provider];
  const model = options.model || models[provider];
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
    headers['HTTP-Referer'] = 'https://unzonk.local';
    headers['X-Title'] = 'Unzonk';
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

  const systemPrompt = `You are Unzonk, a cognitive companion built to clear the mental fog for ADHD/neurodiverse users.
You help organize thoughts, track commitments, detect patterns, and navigate cognitive load.
Current intent: ${intent}.${contextStr}${localStr}${liveStr}
${liveContext.length > 0 ? '\nIMPORTANT: Real-time search results are provided above. Prioritize this live web context for any current news, status, or date-sensitive facts. Do NOT output outdated facts if the live context contains fresh information.\n' : ''}
Be concise, empathetic, and action-oriented. Format key items as bullet points.`;

  // Route through the Key Router: user BYO keys first (round-robin across
  // EVERY key they hold, hundreds allowed), then keyless local providers, then
  // the shared env-key pool. If a key fails (auth / 429 / network) it is put
  // into a 60s cooldown and the next key — or next provider with the same
  // function — is tried automatically.
  const chain = keyRouter.buildChain(user, 'llm');
  for (const route of chain) {
    for (const k of route.keys) {
      try {
        const resp = await callProvider(route.provider, k.key, systemPrompt, message, { endpoint: k.endpoint, model: k.model });
        keyRouter.touch(user.id, route.provider, k.id);
        return resp;
      } catch (e) {
        console.log(`[LLM] ${route.type} ${route.provider} failed: ${e.message}`);
        keyRouter.markCooldown(user.id, route.provider, k.id);
      }
    }
  }

  // Nothing succeeded: free-tier users must bring their own key if no shared keys worked
  if (user.tier === 'free') {
    return 'Your thought has been saved! To get AI-powered responses, add your API key in Mission Control > API Keys. Your message is stored and will be enriched once a key is configured.';
  }

  return 'Your thought has been saved. LLM services are temporarily unavailable. Your message has been stored for later enrichment.';
}

module.exports = { callLLM, callProvider };
