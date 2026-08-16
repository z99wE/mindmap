// Key Router - Central routing for LLM + search providers
//
// The router is the single source of truth for which key gets used, and in
// what order. For a given function (LLM, search) it builds an ordered chain:
//   1. The user's own BYO keys, provider-by-provider in priority order,
//      rotating round-robin across EVERY key they hold (hundreds allowed).
//   2. If a provider is exhausted, fall through to the next provider with
//      the same functionality (e.g. Tavily -> Firecrawl -> SearXNG, or
//      Groq -> OpenAI -> Anthropic).
//   3. Finally the shared env-key pool as a last-resort backup.
// Failures (4xx / 429) put the offending key into a short cooldown so the
// next call skips it and tries the next key automatically.
const { keyPool } = require('./key-pool');
const { decrypt } = require('./crypto');

// Functional groups. `order` is the fallback priority across providers with
// the same purpose; keyless providers are tried last within their group when
// no user key exists for them.
const GROUPS = {
  llm: {
    order: ['groq', 'openai', 'anthropic', 'gemini', 'claude', 'mistral', 'cohere', 'nvidia', 'openrouter', 'ollama', 'lmstudio'],
    keyless: ['ollama', 'lmstudio'],
    poolFallback: ['groq', 'openai', 'anthropic', 'gemini', 'claude'],
  },
  search: {
    order: ['tavily', 'firecrawl', 'searxng_url'],
    keyless: [], // handled natively (DuckDuckGo / Wikipedia)
    poolFallback: [],
  },
};

class KeyRouter {
  constructor() {
    this.cooldowns = new Map();   // `${userId}:${provider}:${keyId}` -> until(ms)
    this.lastUsed = new Map();    // `${userId}:${provider}:${keyId}` -> ts
    this.rrIndex = new Map();     // `${userId}:${provider}` -> next index
  }

  _key(userId, provider, keyId) { return `${userId}:${provider}:${keyId || 'default'}`; }

  _isCooling(userId, provider, keyId) {
    const until = this.cooldowns.get(this._key(userId, provider, keyId));
    if (!until) return false;
    if (Date.now() > until) { this.cooldowns.delete(this._key(userId, provider, keyId)); return false; }
    return true;
  }

  // Mark a key as failed (rate-limit / auth / network). Seconds to cool down.
  markCooldown(userId, provider, keyId, seconds = 60) {
    this.cooldowns.set(this._key(userId, provider, keyId), Date.now() + seconds * 1000);
  }

  touch(userId, provider, keyId) {
    this.lastUsed.set(this._key(userId, provider, keyId), Date.now());
  }

  /**
   * Build the ordered chain of usable routes for a user + function.
   * Returns [{ provider, keys: [{ id, masked, key(decrypted) }] }, ...]
   * Keys in cooldown are skipped; round-robin rotates the start offset so
   * repeated calls spread load across all of the user's keys.
   */
  buildChain(user, group = 'llm') {
    const cfg = GROUPS[group];
    if (!cfg) return [];
    const byo = user?.api_keys || {};
    const chain = [];

    for (const provider of cfg.order) {
      const raw = byo[provider];
      const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      const usable = list.filter((k) => k && k.key && !this._isCooling(user.id, provider, k.id));
      if (usable.length === 0) continue;

      // Round-robin start: rotate through all keys for this provider
      const idxKey = `${user.id}:${provider}`;
      const start = this.rrIndex.get(idxKey) || 0;
      this.rrIndex.set(idxKey, (start + 1) % usable.length);
      const rotated = [...usable.slice(start), ...usable.slice(0, start)];

      // Decrypt each key; only keep routes with at least one usable key so a
      // provider with only broken keys never blocks keyless fallbacks.
      const decrypted = rotated.map((k) => {
        let d = null;
        try { d = decrypt(k.key); } catch { d = null; }
        if (!d) console.warn(`[KeyRouter] ${provider} key ${k.id} failed to decrypt — skipped`);
        return { id: k.id, masked: k.masked || '****', key: d };
      }).filter((k) => k.key);
      if (decrypted.length === 0) continue;

      chain.push({ provider, type: 'byo', keys: decrypted });
    }

    // Keyless providers (local endpoints) — only if user has none of the group's keyed providers
    const hasKeyed = chain.length > 0;
    if (!hasKeyed && cfg.keyless?.length) {
      for (const provider of cfg.keyless) {
        chain.push({ provider, type: 'keyless', keys: [{ id: null, masked: 'local', key: null }] });
      }
    }

    // Shared env-key pool fallback (LLM group only)
    if (group === 'llm') {
      for (const provider of cfg.poolFallback) {
        const poolKey = keyPool.getNextKey(provider);
        if (poolKey) {
          chain.push({ provider: poolKey.provider, type: 'shared', keys: [{ id: poolKey.id, masked: poolKey.id, key: poolKey.key }] });
          break; // one pool route is enough; pool itself round-robins
        }
      }
    }

    return chain;
  }

  // Status snapshot for the API Vault UI: which providers/keys are connected,
  // how many keys each holds, last used time, and active cooldowns.
  getStatus(user) {
    const byo = user?.api_keys || {};
    // Escape legacy stored masked values at read time (maskKey is hardened for
    // new writes, but older rows may carry HTML-significant characters).
    const esc = (s) => String(s || '').replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]));
    const providers = {};
    for (const [provider, raw] of Object.entries(byo)) {
      const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      const entries = list
        .filter((k) => k && k.key)
        .map((k) => ({
          id: k.id,
          masked: esc(k.masked) || '****',
          addedAt: k.addedAt,
          lastUsed: this.lastUsed.get(this._key(user.id, provider, k.id)) || null,
          coolingDown: this._isCooling(user.id, provider, k.id),
        }));
      if (entries.length > 0) providers[provider] = { count: entries.length, keys: entries };
    }

    const cooling = [...this.cooldowns.entries()]
      .filter(([, until]) => Date.now() < until)
      .map(([id, until]) => ({ id, until: new Date(until).toISOString() }));

    return { providers, cooling, groups: GROUPS };
  }
}

const keyRouter = new KeyRouter();
module.exports = { keyRouter, KeyRouter, GROUPS };
