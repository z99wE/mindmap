// Home Page - Hero with real stats + Quick Capture + Marketing
import api from '../lib/api.js';

export function Home() {
  const isLoggedIn = api.isLoggedIn();
  const user = api.getUser();
  const container = document.createElement('div');

  if (isLoggedIn) {
    // Authenticated home
    container.innerHTML = `
      <div class="page-container">
        <section style="margin-bottom:2rem;">
          <h1 class="card-reveal" style="font:var(--md-sys-typescale-display-small);margin-bottom:0.5rem;">
            Good ${getGreeting()}, ${user?.email?.split('@')[0] || 'Explorer'}
          </h1>
          <p class="card-reveal" style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);max-width:600px;">
            Your cognitive coprocessor is ready. Capture thoughts, track commitments, and navigate your mind.
          </p>
        </section>

        <!-- Quick Capture -->
        <div class="surface-card card-reveal" style="margin-bottom:1.5rem;border-left:3px solid var(--md-sys-color-primary);">
          <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.75rem;">Quick Capture</h2>
          <textarea id="quick-capture" class="capture-box" placeholder="Drop a thought, commitment, or question here..."></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:0.75rem;">
            <button class="btn-m3 btn-filled" id="quick-send-btn">
              <span class="material-symbols-rounded" style="font-size:18px;">send</span> Process
            </button>
          </div>
          <div id="quick-result" style="margin-top:0.75rem;display:none;"></div>
        </div>

        <!-- Cognitive Snapshot -->
        <div class="grid-stats card-reveal" id="home-stats">
          <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
          <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
          <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
          <div class="stat-card"><div class="anim-shimmer" style="height:60px;"></div></div>
        </div>

        <div class="grid-cards" style="margin-top:1.5rem;">
          <div class="surface-card glass-glow card-reveal" style="cursor:pointer;" onclick="showPage('interactive-space')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-primary);">psychology</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);">Full Chat</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Rich cognitive conversation with classification chips, commitment detection, and clarification prompts.
            </p>
          </div>
          <div class="surface-card glass-glow card-reveal" style="cursor:pointer;" onclick="showPage('thought-afterlife')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-error);">hourglass_empty</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);">Thought Afterlife</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Watch thoughts decay. Urgent bills escalate in 48h. Someday dreams fade over 30 days.
            </p>
          </div>
          <div class="surface-card glass-glow card-reveal" style="cursor:pointer;" onclick="showPage('commitments')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <span class="material-symbols-rounded" style="font-size:28px;color:var(--md-sys-color-secondary);">task_alt</span>
              <h2 style="font:var(--md-sys-typescale-title-medium);">Commitments</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Track promises with witness accountability. Get nudged before deadlines, not after.
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
    // Public landing page with 7 feature panels
    container.innerHTML = `
      <div class="page-container">
        <section style="text-align:center;padding:4rem 1rem 3rem;">
          <div class="card-reveal" style="margin-bottom:1.5rem;">
            <span class="chip chip-primary" style="margin-bottom:1rem;">Cognitive Coprocessor</span>
          </div>
          <h1 class="card-reveal" style="font:var(--md-sys-typescale-display-large);margin-bottom:1rem;text-wrap:balance;">
            Your thoughts have a half-life.<br>Let the best ones survive.
          </h1>
          <p class="card-reveal" style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);max-width:620px;margin:0 auto 2rem;">
            Thought GPS uses Thought Half-Life, Invisible Checklists, Commitment Witnesses, Departure Briefs, Thought Archaeology, and Thought Interceptors to help ADHD/neurodiverse minds thrive.
          </p>
          <div class="card-reveal" style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
            <button class="btn-m3 btn-filled" onclick="showPage('auth')">Get Started Free</button>
            <button class="btn-m3 btn-outlined" onclick="showPage('how-it-works')">See How It Works</button>
          </div>
        </section>

        <section class="grid-panels card-reveal" style="margin-top:2rem;">
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-error);margin-bottom:0.75rem;">hourglass_empty</span>
            <h2 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Thought Half-Life</h2>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Every thought has an expiry. Urgent bills escalate in 48h. Someday dreams fade over 30 days. Your mind, prioritized by decay.
            </p>
          </div>
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--color-emotional);margin-bottom:0.75rem;">store</span>
            <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Invisible Checklist</h3>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Walk into a supermarket, get a gentle nudge with 3 things your family asked for. Location-aware, zero effort.
            </p>
          </div>
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-secondary);margin-bottom:0.75rem;">person</span>
            <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Commitment Witness</h3>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Say "I'll finish by Friday" and Thought GPS quietly offers accountability. Share with a trusted person, no guilt.
            </p>
          </div>
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--color-analytical);margin-bottom:0.75rem;">door_front</span>
            <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Departure Brief</h3>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Leave home and get a calm 3-line brief: your top tasks, weather check, and deadlines. Like a personal assistant at the door.
            </p>
          </div>
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--color-creative);margin-bottom:0.75rem;">history_edu</span>
            <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Thought Archaeology</h3>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Every Sunday, a zero-judgment review of what didn't move. Not a failure log — a gentle mirror for your week.
            </p>
          </div>
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-tertiary);margin-bottom:0.75rem;">psychology</span>
            <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Thought Interceptor</h3>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              "I need to call the doctor" gets caught, classified, and asked: "When?" Before it slips away.
            </p>
          </div>
          <div class="surface-card">
            <span class="material-symbols-rounded" style="font-size:36px;color:var(--md-sys-color-primary);margin-bottom:0.75rem;">cell_tower</span>
            <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;">Multi-Channel Delivery</h3>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);">
              Connect WhatsApp, Telegram, Slack, or Discord. Your thought nudges, departure briefs, and weekly reviews arrive where you already are.
            </p>
          </div>
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
      <div class="stat-card">
        <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);text-transform:uppercase;letter-spacing:0.08em;">Memories</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-primary);" class="anim-count">${memStats.total || 0}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${memStats.active || 0} active</div>
      </div>
      <div class="stat-card">
        <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);text-transform:uppercase;letter-spacing:0.08em;">Runs Today</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-secondary);" class="anim-count">${billing.dailyRunsRemaining ?? '?'}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">of ${billing.dailyRunsLimit || 10} daily</div>
      </div>
      <div class="stat-card">
        <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);text-transform:uppercase;letter-spacing:0.08em;">Tier</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--md-sys-color-tertiary);" class="anim-count">${billing.tier || 'free'}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">${billing.totalCredits || 0} credits</div>
      </div>
      <div class="stat-card">
        <div style="font:var(--md-sys-typescale-label-small);color:var(--md-sys-color-on-surface-variant);text-transform:uppercase;letter-spacing:0.08em;">Categories</div>
        <div style="font:var(--md-sys-typescale-headline-medium);color:var(--color-emotional);" class="anim-count">${memStats.byCategory?.length || 0}</div>
        <div style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">unique topics</div>
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
