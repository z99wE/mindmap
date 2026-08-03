const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');

// No-op init function for compatibility
function initLangfuse() {
  console.log('[ThoughtTracer] Initialized native thought observability');
}

// Create a trace (a container for spans)
function createTrace(userId, sessionId, input) {
  const traceId = uuidv4();
  return {
    traceId,
    userId,
    input,
    thoughtId: null, // Will be set later when thought is saved
    updateThoughtId: function(id) {
      this.thoughtId = id;
      // Background update of all spans created so far with this traceId
      pool.query(
        'UPDATE thought_traces SET thought_id = $1 WHERE trace_id = $2',
        [id, traceId]
      ).catch(e => console.error('[ThoughtTracer] Error updating thought_id:', e.message));
    }
  };
}

// Create a span representing a step in processing
function createSpan(trace, name, input) {
  if (!trace) return null;
  const spanId = uuidv4();
  
  // Fire and forget insert
  pool.query(
    `INSERT INTO thought_traces (id, trace_id, user_id, thought_id, span_name, input, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [spanId, trace.traceId, trace.userId, trace.thoughtId, name, input, 'RUNNING']
  ).catch(e => console.error('[ThoughtTracer] Error creating span:', e.message));

  return {
    spanId,
    trace,
    name
  };
}

// End a span
function endSpan(span, output, metadata) {
  if (!span) return;
  
  // Fire and forget update
  pool.query(
    `UPDATE thought_traces 
     SET output = $1, status = $2, ended_at = NOW() 
     WHERE id = $3`,
    [output, 'SUCCESS', span.spanId]
  ).catch(e => console.error('[ThoughtTracer] Error ending span:', e.message));
}

// Log an LLM generation (treated as a span here)
function createGeneration(trace, name, model, input, output, usage) {
  if (!trace) return;
  const span = createSpan(trace, name, input);
  endSpan(span, { model, output, usage });
}

// No-op flush
async function flush() {
  // Queries are already fired to Postgres
}

// Standalone LLM tracing for orchestrator.js
function traceLLM({ input, output, model, provider, userId, latencyMs, tokens }) {
  const spanId = uuidv4();
  pool.query(
    `INSERT INTO thought_traces (id, trace_id, user_id, span_name, input, output, status, ended_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [spanId, uuidv4(), userId, 'llm_generation', {input, model, provider, tokens}, {output, latencyMs}, 'SUCCESS']
  ).catch(e => console.error('[ThoughtTracer] Error in traceLLM:', e.message));
}

// Standalone span for orchestrator.js
function traceSpan() {}

module.exports = { initLangfuse, createTrace, createSpan, endSpan, createGeneration, flush, traceLLM, traceSpan };
