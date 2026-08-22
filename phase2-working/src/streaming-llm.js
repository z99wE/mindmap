/**
 * STREAMING LLM — Server-Sent Events for real-time token-by-token output
 *
 * Streams LLM responses token-by-token to the frontend via SSE.
 * Supports all OpenAI-compatible providers (Groq, OpenAI, NVIDIA, etc.)
 * with automatic fallback to non-streaming on providers that don't support it.
 *
 * Cost: $0 (most providers support SSE for free)
 */

'use strict';

const { keyRouter } = require('./key-router');

// ── Provider SSE Endpoints ─────────────────────────────────────────────────
// These are the same as callProvider but with stream: true
const SSE_ENDPOINTS = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
  featherless: 'https://api.featherless.ai/v1/chat/completions',
  fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
  lightning: 'https://api.lightning.ai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  compatible: '',
};

const STREAM_MODELS = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  openrouter: 'meta-llama/llama-3.3-70b-instruct',
  nvidia: 'meta/llama-3.3-70b-instruct',
  featherless: 'meta-llama/Meta-Llama-3-70B-Instruct',
  fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
  lightning: 'meta-llama/Meta-Llama-3-70B-Instruct',
  mistral: 'mistral-large-latest',
  compatible: 'custom',
};

// Providers that don't support streaming (fall back to non-streaming)
const NON_STREAMING_PROVIDERS = new Set(['anthropic', 'gemini', 'cohere', 'ollama', 'lmstudio']);

/**
 * Stream an LLM response via Server-Sent Events.
 *
 * @param {object} user - The user object (for key routing)
 * @param {string} systemPrompt - System prompt
 * @param {string} message - User message
 * @param {object} res - Express response object (will be used as SSE stream)
 * @param {object} options - Additional options (liveContext, etc.)
 * @returns {Promise<string>} - The full response text (after streaming completes)
 */
async function streamLLM(user, systemPrompt, message, res, options = {}) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial event
  res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

  // Build the chain from key router
  const chain = keyRouter.buildChain(user, 'llm');
  let fullResponse = '';

  for (const route of chain) {
    // Skip non-streaming providers for SSE
    if (NON_STREAMING_PROVIDERS.has(route.provider)) continue;

    const endpoint = SSE_ENDPOINTS[route.provider];
    if (!endpoint) continue;

    for (const k of route.keys) {
      try {
        fullResponse = await _streamFromProvider(
          route.provider,
          k.key,
          systemPrompt,
          message,
          res,
          { endpoint: k.endpoint, model: k.model }
        );
        keyRouter.touch(user.id, route.provider, k.id);

        // Send completion event
        res.write(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`);
        res.end();
        return fullResponse;
      } catch (e) {
        console.log(`[StreamLLM] ${route.provider} failed: ${e.message}`);
        keyRouter.markCooldown(user.id, route.provider, k.id);
      }
    }
  }

  // All streaming providers failed — try non-streaming fallback
  for (const route of chain) {
    if (!NON_STREAMING_PROVIDERS.has(route.provider)) continue;
    for (const k of route.keys) {
      try {
        const { callProvider } = require('./llm-provider');
        fullResponse = await callProvider(route.provider, k.key, systemPrompt, message, {
          endpoint: k.endpoint,
          model: k.model,
        });
        keyRouter.touch(user.id, route.provider, k.id);

        // Send as a single chunk (non-streaming fallback)
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: fullResponse })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`);
        res.end();
        return fullResponse;
      } catch (e) {
        keyRouter.markCooldown(user.id, route.provider, k.id);
      }
    }
  }

  // Nothing worked
  const fallback = 'Your thought has been saved. AI response is temporarily unavailable.';
  res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallback })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done', fullResponse: fallback })}\n\n`);
  res.end();
  return fallback;
}

/**
 * Stream from a specific OpenAI-compatible provider.
 */
async function _streamFromProvider(provider, apiKey, systemPrompt, message, res, options = {}) {
  const endpoint = options.endpoint || SSE_ENDPOINTS[provider];
  const model = options.model || STREAM_MODELS[provider];
  if (!endpoint) throw new Error(`No streaming endpoint for ${provider}`);

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    max_tokens: 1024,
    temperature: 0.7,
    stream: true,
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://rementally.local';
    headers['X-Title'] = 'ReMentally';
  }

  return new Promise((resolve, reject) => {
    const https = require('https');
    const url = new URL(endpoint);

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers,
    }, (apiRes) => {
      if (apiRes.statusCode >= 400) {
        let errData = '';
        apiRes.on('data', chunk => { errData += chunk; });
        apiRes.on('end', () => reject(new Error(`${apiRes.statusCode}: ${errData.slice(0, 200)}`)));
        return;
      }

      let fullResponse = '';
      let buffer = '';

      apiRes.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              // Send chunk to client
              res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
            }
          } catch {
            // Skip unparseable lines
          }
        }
      });

      apiRes.on('end', () => {
        // Process any remaining buffer
        if (buffer) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
              }
            } catch {}
          }
        }
        resolve(fullResponse);
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Stream timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = {
  streamLLM,
  SSE_ENDPOINTS,
  STREAM_MODELS,
  NON_STREAMING_PROVIDERS,
};
