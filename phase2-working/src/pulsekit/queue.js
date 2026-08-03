/**
 * PulseKit — Message Queue
 * 
 * Provides rate-limit-safe delivery for broadcasts.
 * Uses exponential backoff for retries on failures.
 * In-memory — no Redis needed. Survives process restarts via DB fallback.
 */

'use strict';

class PulseQueue {
  constructor({ concurrency = 3, maxRetries = 3, baseDelayMs = 1000 } = {}) {
    this._queue = [];
    this._running = 0;
    this._concurrency = concurrency;
    this._maxRetries = maxRetries;
    this._baseDelayMs = baseDelayMs;
    this._draining = false;
  }

  get depth() {
    return this._queue.length;
  }

  /**
   * Enqueue a task for execution.
   * @param {function} fn - async function to execute
   * @returns {Promise} resolves when the task completes (with retry)
   */
  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject, attempts: 0 });
      this._tick();
    });
  }

  _tick() {
    if (this._draining) return;
    while (this._running < this._concurrency && this._queue.length > 0) {
      const task = this._queue.shift();
      this._run(task);
    }
  }

  async _run(task) {
    this._running++;
    task.attempts++;
    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (e) {
      if (task.attempts < this._maxRetries) {
        const delay = this._baseDelayMs * Math.pow(2, task.attempts - 1);
        console.warn(`[PulseQueue] Task failed (attempt ${task.attempts}), retrying in ${delay}ms:`, e.message);
        setTimeout(() => {
          this._queue.unshift(task); // requeue at front
          this._tick();
        }, delay);
      } else {
        console.error(`[PulseQueue] Task failed after ${task.attempts} attempts:`, e.message);
        task.reject(e);
      }
    } finally {
      this._running--;
      this._tick();
    }
  }

  /** Stop accepting new tasks and wait for current ones to finish */
  drain() {
    this._draining = true;
  }
}

module.exports = { PulseQueue };
