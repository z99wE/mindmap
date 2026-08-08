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
              <span style="font:700 13px/1 'Space Grotesk';">PROCESS</span>
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
              <span class="dot" style="width:10px;height:10px;border-radius:50%;background:var(--md-sys-color-primary);box-shadow:0 0 8px rgba(204,255,0,0.3);"></span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Full Chat</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Rich cognitive conversation with classification chips and commitment detection.
            </p>
          </div>
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('map-my-mind')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="dot" style="width:10px;height:10px;border-radius:50%;background:var(--md-sys-color-secondary);box-shadow:0 0 8px rgba(163,230,53,0.3);"></span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Thought GPS</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Navigate your mental landscape. See thoughts grouped by theme and connections.
            </p>
          </div>
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('thought-afterlife')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="dot" style="width:10px;height:10px;border-radius:50%;background:var(--md-sys-color-error);box-shadow:0 0 8px rgba(239,68,68,0.3);"></span>
              <h2 style="font:var(--md-sys-typescale-title-medium);margin:0;">Thought Afterlife</h2>
            </div>
            <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
              Watch thoughts decay. Urgent items escalate. Someday dreams fade over time.
            </p>
          </div>
          <div class="surface-card" style="padding:1.5rem;cursor:pointer;" onclick="showPage('commitments')">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
              <span class="dot" style="width:10px;height:10px;border-radius:50%;background:var(--md-sys-color-tertiary);box-shadow:0 0 8px rgba(16,185,129,0.3);"></span>
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
            <div style="padding:1.5rem;">
              <div class="tg-skeleton tg-skeleton--title"></div>
              <div class="tg-skeleton"></div>
              <div class="tg-skeleton"></div>
            </div>
          </div>
        </section>
      </div>`;

    loadHomeStats(container);
    setupQuickCapture(container);
  } else {
    // Render the React-based cinematic landing page
    setTimeout(() => {
      import('react').then((React) => {
        import('react-dom/client').then((ReactDOM) => {
          import('../components/LandingPage.jsx').then((module) => {
            const LandingPage = module.default;
            const root = ReactDOM.createRoot(container);
            root.render(
              React.createElement(LandingPage, {
                onNavigate: (page) => window.showPage(page),
                isLoggedIn: isLoggedIn
              })
            );
          });
        });
      });
    }, 0);
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
          <span class="mono-label" style="color:var(--color-success);font-size:10px;">DONE</span>
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
        <span class="mono-label" style="font-size:10px;color:${m.urgencyTier === 'critical' ? 'var(--md-sys-color-error)' : m.urgencyTier === 'high' ? 'var(--color-analytical)' : 'var(--md-sys-color-outline)'};">${m.urgencyTier === 'critical' ? 'CRIT' : m.urgencyTier === 'high' ? 'HIGH' : 'NOTE'}</span>
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
    thoughtsEl.innerHTML = '<div class="tg-state"><div class="tg-state-title">No thoughts captured yet</div><div class="tg-state-body">Use Quick Capture above, or open the full chat to start a thread. Everything you capture lands here first.</div></div>';
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
