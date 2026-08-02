// Home Page - Hero with real stats + Quick Capture + Marketing
import api from '../lib/api.js';

export function Home() {
  const isLoggedIn = api.isLoggedIn();
  const user = api.getUser();
  const container = document.createElement('div');

  if (isLoggedIn) {
    // Authenticated home
    container.innerHTML = `
      <div class="page-shell">
        <section class="card-reveal" style="margin-bottom:2rem;">
          <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">DASHBOARD</div>
          <h1 style="font:var(--md-sys-typescale-display-small);margin:0 0 0.25rem;letter-spacing:-0.06em;">
            Good ${getGreeting()}, ${user?.email?.split('@')[0] || 'Explorer'}
          </h1>
          <p style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Your cognitive coprocessor is ready. Capture thoughts, track commitments, and navigate your mind.
          </p>
        </section>

        <!-- Quick Capture -->
        <div class="surface-card card-reveal" style="padding:1.5rem;margin-bottom:1.5rem;border-left:3px solid var(--md-sys-color-primary);">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.75rem;">Quick Capture</h2>
          <textarea id="quick-capture" class="input-m3" rows="2" placeholder="Drop a thought, commitment, or question here..." style="resize:vertical;min-height:48px;width:100%;"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:0.75rem;">
            <button class="btn-m3 btn-filled" id="quick-send-btn">
              <span class="material-symbols-rounded" style="font-size:18px;">send</span> Process
            </button>
          </div>
          <div id="quick-result" style="margin-top:0.75rem;display:none;"></div>
        </div>

        <!-- Cognitive Snapshot -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;" class="card-reveal" id="home-stats">
          <div class="surface-card" style="padding:1.25rem;text-align:center;"><div class="anim-shimmer" style="height:60px;"></div></div>
          <div class="surface-card" style="padding:1.25rem;text-align:center;"><div class="anim-shimmer" style="height:60px;"></div></div>
          <div class="surface-card" style="padding:1.25rem;text-align:center;"><div class="anim-shimmer" style="height:60px;"></div></div>
          <div class="surface-card" style="padding:1.25rem;text-align:center;"><div class="anim-shimmer" style="height:60px;"></div></div>
        </div>

        <!-- Feature Grid -->
        <div class="bento-grid card-reveal" style="margin-top:1.5rem;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;">
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('interactive-space')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-primary);">psychology</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Full Chat</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Rich cognitive conversation with classification chips and commitment detection.
            </p>
          </div>
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('map-my-mind')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-secondary);">explore</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Map My Mind</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Navigate your mental landscape. See thoughts grouped by theme and connections.
            </p>
          </div>
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('thought-afterlife')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-error);">hourglass_empty</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Thought Afterlife</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Watch thoughts decay. Urgent items escalate. Someday dreams fade over time.
            </p>
          </div>
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('commitments')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-tertiary);">task_alt</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Commitments</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Track promises with witness accountability. Nudged before deadlines, not after.
            </p>
          </div>
        </div>

        <section class="card-reveal" style="margin-top:2rem;">
          <h2 style="font:var(--md-sys-typescale-title-large);margin-bottom:1rem;">Recent Activity</h2>
          <div id="recent-thoughts" class="surface-card" style="padding:0;">
            <div style="padding:2rem;text-align:center;color:var(--md-sys-color-outline);">
              <div class="spinner-m3" style="margin:0 auto;"></div>
            </div>
          </div>
        </section>
      </div>`;

    loadHomeStats(container);
    setupQuickCapture(container);
  } else {
    // Public landing page — Obsidian/Orange-Red bento design
    container.innerHTML = `
      <div class="page-shell">
        <!-- Hero -->
        <section style="text-align:center;padding:3rem 1rem 2rem;">
          <div class="card-reveal status-tag" style="display:inline-flex;margin-bottom:1.5rem;">
            <span class="dot-pulse"></span>
            <span>COGNITIVE COPROCESSOR</span>
          </div>
          <h1 class="card-reveal" style="font:var(--md-sys-typescale-display-large);margin-bottom:1rem;text-wrap:balance;letter-spacing:-0.06em;">
            Your thoughts have a<br><span style="color:var(--md-sys-color-primary);">half-life.</span><br>Let the best ones survive.
          </h1>
          <p class="card-reveal" style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);max-width:600px;margin:0 auto 2rem;">
            Thought GPS uses half-life decay, commitment witnesses, departure briefs, geo-fencing, and thought interceptors to help ADHD/neurodiverse minds thrive.
          </p>
          <div class="card-reveal" style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
            <button class="btn-m3 btn-filled" style="box-shadow:0 0 30px rgba(255,69,0,0.3);" onclick="showPage('auth')">Start Navigating</button>
            <button class="btn-m3 btn-outlined" onclick="showPage('how-it-works')">See How It Works</button>
          </div>
        </section>

        <!-- Use Cases Bento Grid -->
        <section class="card-reveal" style="margin-top:3rem;">
          <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:1rem;">USE CASES</div>
          <div class="bento-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-error);margin-bottom:0.75rem;display:block;">hourglass_empty</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Thought Half-Life</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Every thought has an expiry. Urgent bills escalate in 48h. Someday dreams fade over 30 days. Your mind, prioritized by decay.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">near_me</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Geo-fencing</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Walk into a store, get a gentle nudge with 3 things your family asked for. Leave home, get a departure brief. Location-aware, zero effort.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-secondary);margin-bottom:0.75rem;display:block;">notifications_active</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Push Notifications</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Browser push, WhatsApp, Telegram, Slack, Discord — your thought nudges and departure briefs arrive where you already are.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-tertiary);margin-bottom:0.75rem;display:block;">explore</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Map My Mind</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Navigate your mental landscape. See thoughts grouped by theme, connected by person, filtered by urgency.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--color-analytical);margin-bottom:0.75rem;display:block;">task_alt</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Commitment Witness</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Say "I'll finish by Friday" and Thought GPS quietly offers accountability. Share with a trusted person, no guilt.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--color-creative);margin-bottom:0.75rem;display:block;">history_edu</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Thought Archaeology</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Every Sunday, a zero-judgment review of what didn't move. Not a failure log — a gentle mirror for your week.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">psychology</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Thought Interceptor</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                "I need to call the doctor" gets caught, classified, and asked: "When?" Before it slips away.
              </p>
            </div>
            <div class="surface-card" style="padding:1.5rem;">
              <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-secondary);margin-bottom:0.75rem;display:block;">travel_explore</span>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Live Web Search</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Enrich thoughts with live data from Tavily, Firecrawl, DuckDuckGo, or your own SearXNG instance.
              </p>
            </div>
          </div>
        </section>

        <!-- How It Works -->
        <section class="card-reveal" style="margin-top:3rem;padding:2rem;">
          <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:1rem;">HOW IT WORKS</div>
          <div style="display:flex;gap:2rem;flex-wrap:wrap;justify-content:center;">
            <div style="text-align:center;flex:1;min-width:200px;">
              <div style="width:48px;height:48px;border-radius:50%;background:var(--md-sys-color-primary);color:#fff;display:grid;place-items:center;margin:0 auto 0.75rem;font:var(--font-mono);font-size:18px;font-weight:700;">01</div>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Connect</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Add your API keys (Groq is free), connect messaging channels, and set up geo-fences.
              </p>
            </div>
            <div style="text-align:center;flex:1;min-width:200px;">
              <div style="width:48px;height:48px;border-radius:50%;background:var(--md-sys-color-secondary);color:#fff;display:grid;place-items:center;margin:0 auto 0.75rem;font:var(--font-mono);font-size:18px;font-weight:700;">02</div>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Capture</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Drop thoughts via chat, quick capture, or connected channels. Every thought is classified and stored.
              </p>
            </div>
            <div style="text-align:center;flex:1;min-width:200px;">
              <div style="width:48px;height:48px;border-radius:50%;background:var(--md-sys-color-tertiary);color:#fff;display:grid;place-items:center;margin:0 auto 0.75rem;font:var(--font-mono);font-size:18px;font-weight:700;">03</div>
              <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Navigate</h3>
              <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
                Map your mind, review commitments, and let the important thoughts rise to the top.
              </p>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <section class="card-reveal" style="text-align:center;margin-top:3rem;padding:2rem;">
          <h2 style="font:var(--md-sys-typescale-headline-medium);margin:0 0 1rem;letter-spacing:-0.06em;">Ready to navigate your mind?</h2>
          <button class="btn-m3 btn-filled" style="box-shadow:0 0 30px rgba(255,69,0,0.3);font-size:16px;padding:0.75rem 2rem;" onclick="showPage('auth')">Start Navigating — Free</button>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.75rem;">10 runs/day with your own API keys. No credit card required.</p>
        </section>
      </div>`;
  }

  return container;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function setupQuickCapture(container) {
  const btn = container.querySelector('#quick-send-btn');
  const textarea = container.querySelector('#quick-capture');
  const resultEl = container.querySelector('#quick-result');

  btn?.addEventListener('click', async () => {
    const msg = textarea?.value?.trim();
    if (!msg) return;
    btn.disabled = true;
    const result = await api.post('/process/message', { message: msg });
    btn.disabled = false;
    textarea.value = '';
    resultEl.style.display = 'block';

    if (result.error) {
      resultEl.innerHTML = `<div style="color:var(--md-sys-color-error);font:var(--md-sys-typescale-body-medium);">${escHtml(result.error)}</div>`;
    } else {
      const c = result.classification || {};
      resultEl.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:0.75rem;">
          <span class="material-symbols-rounded" style="font-size:20px;color:var(--color-success);">check_circle</span>
          <div style="flex:1;">
            <div style="font:var(--md-sys-typescale-body-medium);margin-bottom:0.5rem;">${formatResponse(result.response)}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              ${c.urgencyTier ? `<span class="classification-chip ${c.urgencyTier}">${c.urgencyTier}</span>` : ''}
              ${c.category && c.category !== 'other' ? `<span class="classification-chip low">${c.category}</span>` : ''}
              ${c.halfLifeHours ? `<span class="classification-chip low">${c.halfLifeHours}h half-life</span>` : ''}
              ${result.commitment?.is_commitment ? '<span class="classification-chip high">Commitment</span>' : ''}
              ${result.unanchored?.is_unanchored ? `<span class="classification-chip medium">Needs ${result.unanchored.missing}</span>` : ''}
            </div>
            ${result.sources?.length ? `<div style="margin-top:0.5rem;font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Sources: ${result.sources.map(s => `<a href="${s.url}" target="_blank" style="color:var(--md-sys-color-primary);">${s.source}</a>`).join(', ')}</div>` : ''}
          </div>
        </div>`;
    }
  });
}

async function loadHomeStats(container) {
  const [memStats, billing, recent] = await Promise.all([
    api.get('/memory/stats'),
    api.get('/billing/status'),
    api.get('/memory?limit=5'),
  ]);

  const statsEl = container.querySelector('#home-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="surface-card" style="padding:1.25rem;text-align:center;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);">MEMORIES</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-primary);">${memStats.total || 0}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${memStats.active || 0} active</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;text-align:center;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);">RUNS LEFT</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-secondary);">${billing.dailyRunsRemaining ?? '?'}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">of ${billing.dailyRunsLimit || 10}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;text-align:center;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);">TIER</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-tertiary);">${billing.tier || 'free'}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${billing.totalCredits || 0} credits</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;text-align:center;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);">TOPICS</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--color-emotional);">${memStats.byCategory?.length || 0}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">unique</div>
      </div>`;
  }

  const thoughtsEl = container.querySelector('#recent-thoughts');
  if (thoughtsEl && recent.memories?.length > 0) {
    thoughtsEl.innerHTML = recent.memories.map(m => `
      <div style="padding:0.875rem 1rem;border-bottom:1px solid var(--md-sys-color-outline-variant);display:flex;align-items:center;gap:0.75rem;">
        <span class="material-symbols-rounded" style="font-size:20px;color:${m.urgencyTier === 'critical' ? 'var(--md-sys-color-error)' : m.urgencyTier === 'high' ? 'var(--color-analytical)' : 'var(--md-sys-color-outline)'};">
          ${m.urgencyTier === 'critical' ? 'warning' : m.urgencyTier === 'high' ? 'schedule' : 'chat_bubble'}
        </span>
        <div style="flex:1;min-width:0;">
          <div style="font:var(--md-sys-typescale-body-medium);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(m.content)}</div>
          <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">
            ${m.category || 'general'} · ${timeAgo(m.createdAt)}
            ${m.urgencyTier ? ` · <span class="classification-chip ${m.urgencyTier}" style="font-size:9px;padding:1px 5px;">${m.urgencyTier}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } else if (thoughtsEl) {
    thoughtsEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-medium);">No thoughts captured yet. Start with Quick Capture above or open the Full Chat.</div>';
  }
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatResponse(text) {
  if (!text) return '';
  return escHtml(text).replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/- (.*?)(<br>|$)/g, '• $1$2');
}
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
