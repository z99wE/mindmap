// Langfuse Observability - wraps LLM calls in traces/spans
const { Langfuse } = require('langfuse');
require('dotenv').config();

let langfuse = null;

function initLangfuse() {
  if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) {
    langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
    });
    console.log('[Langfuse] Initialized observability');
  } else {
    console.log('[Langfuse] No keys configured, tracing disabled');
  }
}

// Create a trace for a full user interaction
function createTrace(userId, sessionId, input) {
  if (!langfuse) return null;
  return langfuse.trace({
    name: 'thought-gps-process',
    userId,
    sessionId: sessionId || userId,
    input: { message: input },
    metadata: { timestamp: new Date().toISOString() },
  });
}

// Create a span for an orchestrator node
function createSpan(trace, name, input) {
  if (!trace) return null;
  return trace.span({
    name,
    input,
    startTime: new Date(),
  });
}

// End a span with output
function endSpan(span, output, metadata) {
  if (!span) return;
  span.end({
    output,
    metadata,
    endTime: new Date(),
  });
}

// Log an LLM generation
function createGeneration(trace, name, model, input, output, usage) {
  if (!trace) return;
  trace.generation({
    name,
    model,
    input,
    output,
    usage: usage ? {
      promptTokens: usage.prompt_tokens || usage.input_tokens || 0,
      completionTokens: usage.completion_tokens || usage.output_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    } : undefined,
  });
}

// Flush pending events (call before server shutdown)
async function flush() {
  if (langfuse) await langfuse.flushAsync();
}

module.exports = { initLangfuse, createTrace, createSpan, endSpan, createGeneration, flush };
