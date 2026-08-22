// Dashboard - Real stats from backend with Obsidian/Orange-Red design
import api from '../lib/api.js';

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

export function Dashboard() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">OVERVIEW</div>
        <h1 style="font:700 2rem/1.1 'Space Grotesk',system-ui;letter-spacing:-0.06em;margin:0;">Dashboard</h1>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:1.5rem;" id="dash-stats">
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
        <div class="surface-card card-reveal" style="padding:1.25rem;"><div class="anim-shimmer" style="height:60px;"></div></div>
      </div>

      <!-- Run Usage + Cognitive Load -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1.5rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Run Usage</h3>
          <div id="run-gauge"><div class="progress-bar"><span style="width:0%"></span></div></div>
          <p id="run-text" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Cognitive Load</h3>
          <div id="cog-load" style="display:flex;flex-direction:column;gap:0.5rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></p>
          </div>
        </div>
      </div>

      <!-- Memory Growth + 14-Day Trend -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">Memory by Category</h3>
          <div id="mem-chart" style="display:flex;flex-direction:column;gap:0.5rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></p>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;">14-Day Activity</h3>
          <div id="trend-chart" style="min-height:100px;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);"><span class="tg-skeleton" style="display:inline-block;width:9rem;vertical-align:middle;"></span></p>
          </div>
        </div>
      </div>

      <!-- Predictive Intelligence & Agent Swarm -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(204,255,0,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-primary);">
            <span class="material-symbols-rounded">psychology</span>
            ADHD Predictive Insight
          </h3>
          <div id="predictive-insight-card" style="display:flex;flex-direction:column;gap:0.75rem;">
            <p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">Analyzing cognitive patterns...</p>
          </div>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;background:#050505;border:1px solid rgba(204,255,0,0.2);position:relative;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;color:var(--md-sys-color-secondary);z-index:2;position:relative;">
            <span class="material-symbols-rounded">grain</span>
            I am thinking
          </h3>
          <div style="position:relative; width:100%; height:250px; overflow:hidden; border-radius:8px;">
            <canvas id="thinking-canvas" style="width:100%; height:100%; display:block;"></canvas>
            <div id="thinking-tooltip" style="position:absolute; pointer-events:none; opacity:0; background:rgba(0,0,0,0.8); border:1px solid var(--md-sys-color-secondary); color:#fff; padding:8px 12px; border-radius:4px; font-size:12px; transition:opacity 0.2s; white-space:nowrap; max-width:200px; text-overflow:ellipsis; overflow:hidden; z-index:10; font-family:'JetBrains Mono',monospace;">
              Tooltip
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;">send_to_mobile</span>
            Dispatch Digest
          </h3>
          <p style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-on-surface-variant);margin-bottom:1rem;">
            Send a summary of your recent thoughts to your connected messaging channels (Telegram, Discord, Slack, etc.).
          </p>
          <button class="btn-m3 btn-filled" id="digest-btn" style="width:100%;height:44px;font-weight:bold;">
            <span class="material-symbols-rounded" style="font-size:18px;">send</span>
            Send Digest Now
          </button>
          <p id="digest-status" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);margin-top:0.5rem;text-align:center;"></p>
        </div>
      </div>

      <!-- Cognitive Insights (Proprietary) -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
        <!-- Cognitive Load Forecast -->
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(204,255,0,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-primary);">monitoring</span>
            Cognitive Load Forecast
          </h3>
          <div id="load-forecast" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Analyzing...</div>
        </div>

        <!-- Attention Debt Score -->
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(251,191,36,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;color:#f59e0b;">score</span>
            Attention Debt Score
          </h3>
          <div id="debt-score" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Calculating...</div>
        </div>

        <!-- Narrative Memory -->
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(99,102,241,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;color:#818cf8;">auto_stories</span>
            Narrative Memory
          </h3>
          <div id="narrative-memory" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Generating...</div>
        </div>

        <!-- Commitment Probability -->
        <div class="surface-card card-reveal" style="padding:1.5rem;border:1px solid rgba(16,185,129,0.15);">
          <h3 style="font:var(--md-sys-typescale-title-medium);margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;">
            <span class="material-symbols-rounded" style="font-size:18px;color:#10b981;">fact_check</span>
            Commitment Probability
          </h3>
          <div id="commitment-prob" style="font:var(--md-sys-typescale-body-small);color:var(--md-sys-color-outline);">Computing...</div>
        </div>
      </div>
    </div>`;

  loadDashboard(container);
  return container;
}

async function loadDashboard(c) {
  const [billing, memStats, cogData, driftData, thinkingData] = await Promise.all([
    api.get('/billing/status'),
    api.get('/memory/stats'),
    api.get('/features/cognitive-load'),
    api.get('/features/drift-status'),
    api.get('/features/i-am-thinking')
  ]);

  // Stat cards
  const statsEl = c.querySelector('#dash-stats');
  if (!billing.error) {
    const tierLabel = (billing.tier || 'free').charAt(0).toUpperCase() + (billing.tier || 'free').slice(1);
    statsEl.innerHTML = `
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid var(--md-sys-color-primary);">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Plan</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:var(--md-sys-color-primary);">${tierLabel}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid var(--md-sys-color-secondary);">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Runs Left</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:var(--md-sys-color-secondary);">${billing.dailyRunsRemaining ?? 0}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid #10b981;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Credits</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:#10b981;">${billing.totalCredits ?? 0}</div>
      </div>
      <div class="surface-card" style="padding:1.25rem;border-left:3px solid #a3e635;">
        <div class="mono-label" style="color:var(--md-sys-color-outline);font-size:10px;text-transform:uppercase;margin-bottom:0.35rem;">Memories</div>
        <div style="font:700 1.5rem/1 'Space Grotesk',system-ui;color:#a3e635;">${memStats.total || 0}</div>
      </div>`;

    // Run gauge
    const pct = billing.dailyRunsLimit > 0 ? Math.round(billing.dailyRunsUsed / billing.dailyRunsLimit * 100) : 0;
    c.querySelector('#run-gauge').innerHTML = `
      <div style="position:relative;height:8px;border-radius:4px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--md-sys-color-primary);border-radius:4px;transition:width 0.5s ease;"></div>
      </div>`;
    c.querySelector('#run-text').textContent = `${billing.dailyRunsUsed || 0} / ${billing.dailyRunsLimit || 0} runs used today`;
  } else {
    statsEl.innerHTML = '<div class="tg-state tg-state--error" style="grid-column:1/-1;"><div class="tg-state-title">Billing status unavailable</div><div class="tg-state-body">We could not reach the usage service. Your data is safe — this panel will fill in once the connection returns.</div><button class="tg-state-action" onclick="showPage(&#39;dashboard&#39;)">Try again</button></div>';
  }

  // Cognitive Load
  if (!cogData.error && cogData.distribution?.length > 0) {
    const loadColors = { critical: '#f44336', high: '#ff9800', medium: '#ccff00', low: '#10b981' };
    c.querySelector('#cog-load').innerHTML = cogData.distribution.map(d => `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
          <span class="mono-label" style="font-size:10px;text-transform:uppercase;color:var(--md-sys-color-on-surface-variant);">${d.type}</span>
          <span class="mono-label" style="font-size:10px;color:${loadColors[d.type] || 'var(--md-sys-color-outline)'};">${d.percentage}%</span>
        </div>
        <div style="height:4px;border-radius:2px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
          <div style="height:100%;width:${d.percentage}%;background:${loadColors[d.type] || 'var(--md-sys-color-primary)'};border-radius:2px;"></div>
        </div>
      </div>
    `).join('');

    // Trend chart
    if (cogData.trend?.length > 0) {
      const dates = [...new Set(cogData.trend.map(t => t.date))].sort();
      const maxCount = Math.max(...dates.map(d => cogData.trend.filter(t => t.date === d).reduce((s, t) => s + t.count, 0)), 1);
      c.querySelector('#trend-chart').innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:4px;height:100px;">
          ${dates.map(d => {
            const dayCount = cogData.trend.filter(t => t.date === d).reduce((s, t) => s + t.count, 0);
            const h = Math.max(2, (dayCount / maxCount) * 80);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
              <div style="width:100%;height:${h}px;background:var(--md-sys-color-primary);border-radius:2px 2px 0 0;opacity:0.8;"></div>
              <span style="font:8px var(--font-mono),monospace;color:var(--md-sys-color-outline);margin-top:2px;">${d.slice(5)}</span>
            </div>`;
          }).join('')}
        </div>`;
    } else {
      c.querySelector('#trend-chart').innerHTML = '<p style="color:var(--md-sys-color-outline);font:var(--md-sys-typescale-body-small);">No activity in the last 14 days.</p>';
    }
  }

  // Memory by category
  let topCategory = 'Uncategorized';
  if (!memStats.error && memStats.byCategory?.length > 0) {
    // Sort to find top category
    const sorted = [...memStats.byCategory].sort((a, b) => b.count - a.count);
    if (sorted[0]) topCategory = sorted[0].category;

    c.querySelector('#mem-chart').innerHTML = memStats.byCategory.slice(0, 8).map(cat => {
      const pct = memStats.total > 0 ? Math.round(cat.count / memStats.total * 100) : 0;
      return `<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
          <span style="font:var(--md-sys-typescale-label-small);text-transform:capitalize;">${cat.category}</span>
          <span class="mono-label" style="font-size:10px;color:var(--md-sys-color-primary);">${cat.count}</span>
        </div>
        <div style="height:4px;border-radius:2px;background:var(--md-sys-color-surface-container-highest);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--md-sys-color-primary);border-radius:2px;"></div>
        </div>
      </div>`;
    }).join('');
  } else if (!memStats.error) {
    c.querySelector('#mem-chart').innerHTML = '<div class="tg-state"><div class="tg-state-title">No memories stored yet</div><div class="tg-state-body">Categories build up as you capture thoughts. This chart fills in on its own.</div></div>';
  }

  // Load Predictive ADHD insights
  const predCard = c.querySelector('#predictive-insight-card');
  if (predCard) {
    const isHighRisk = driftData && driftData.isHighRisk;
    const predictionStr = (driftData && driftData.prediction) ? driftData.prediction : (isHighRisk ? '+28% (Severe)' : 'Stable');
    const trendStr = (driftData && driftData.trend) ? driftData.trend : (isHighRisk 
      ? 'Critical load detected. Congestion spikes predicted for Tuesday. We suggest immediate task pruning or witness escalation.' 
      : 'Cognitive bandwidth is optimal. Your mental drift pattern is balanced. Keep capturing thoughts to maintain clarity.');

    predCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:12px;color:var(--md-sys-color-outline);">Burnout Risk Level</span>
        <span class="classification-chip ${isHighRisk ? 'critical' : 'low'}" style="font-size:10px;">${isHighRisk ? 'HIGH RISK' : 'LOW RISK'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:12px;color:var(--md-sys-color-outline);">Hyperfixation Target</span>
        <span style="font-size:12px;font-weight:bold;color:var(--md-sys-color-primary);">${topCategory.toUpperCase()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:12px;color:var(--md-sys-color-outline);">Task Drift Prediction</span>
        <span style="font-size:12px;color:#ff9800;font-weight:bold;">${predictionStr}</span>
      </div>
      <p style="font-size:11px;line-height:1.4;margin-top:0.5rem;color:var(--md-sys-color-on-surface-variant);background:rgba(204,255,0,0.03);padding:0.5rem;border-radius:4px;border:1px dashed rgba(204,255,0,0.15);">
        <strong>Futurism Trend:</strong> ${trendStr}
      </p>
    `;
  }

  // Load I am thinking visualization
  const canvas = c.querySelector('#thinking-canvas');
  if (canvas && thinkingData && thinkingData.nodes) {
    const ctx = canvas.getContext('2d');
    const tooltip = c.querySelector('#thinking-tooltip');
    
    // Resize canvas
    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let mouseX = -1000;
    let mouseY = -1000;
    let hoveredNode = null;
    let rotation = 0;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
      mouseX = -1000;
      mouseY = -1000;
      tooltip.style.opacity = '0';
      hoveredNode = null;
    });

    const draw = () => {
      if (!document.body.contains(canvas)) return; // stop loop if unmounted
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      if (!hoveredNode) {
        rotation += 0.002; // slow ambient rotation
      }

      hoveredNode = null;

      thinkingData.nodes.forEach(node => {
        // Apply rotation
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const nx = node.x * cosR - node.y * sinR + cx;
        const ny = node.x * sinR + node.y * cosR + cy;

        // Check hover
        const dist = Math.hypot(nx - mouseX, ny - mouseY);
        if (dist < 6) {
          hoveredNode = { ...node, drawX: nx, drawY: ny };
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(nx, ny, dist < 6 ? 4 : 2, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowBlur = dist < 6 ? 10 : 4;
        ctx.shadowColor = node.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Show tooltip if hovering
      if (hoveredNode) {
        tooltip.innerHTML = `<strong style="color:${hoveredNode.color}">${escHtml(hoveredNode.tag)}</strong><br/>${escHtml(hoveredNode.content)}`;
        tooltip.style.left = (hoveredNode.drawX + 10) + 'px';
        tooltip.style.top = (hoveredNode.drawY + 10) + 'px';
        tooltip.style.opacity = '1';
      } else {
        tooltip.style.opacity = '0';
      }

      requestAnimationFrame(draw);
    };

	    draw();
	  }

	  // Load Cognitive Insights
	  async function loadCognitiveInsights() {
	    // 1. Load Forecast
	    try {
	      const fc = await api.get('/cognitive/forecast');
	      const el = c.querySelector('#load-forecast');
	      if (fc.currentLoad !== undefined) {
	        const color = fc.currentLoad < 30 ? '#22c55e' : fc.currentLoad < 60 ? '#84cc16' : fc.currentLoad < 80 ? '#f59e0b' : '#ef4444';
	        el.innerHTML = `
	          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">
	            <div style="font:700 2rem/1 var(--font-heading);color:${color};">${fc.currentLoad}</div>
	            <div style="flex:1;">
	              <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;">
	                <div style="height:100%;width:${fc.currentLoad}%;background:${color};border-radius:3px;transition:width 0.5s;"></div>
	              </div>
	            </div>
	          </div>
	          <p style="margin:0;font-size:12px;line-height:1.5;">${fc.insight || ''}</p>
	          ${fc.forecast ? `<div style="display:flex;gap:3px;margin-top:0.5rem;align-items:flex-end;height:32px;">${fc.forecast.map(d =>
	            `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
	              <div style="width:100%;height:${(d.load / 100) * 28}px;border-radius:2px;background:${d.severity === 'critical' ? '#ef4444' : d.severity === 'high' ? '#f59e0b' : d.severity === 'medium' ? '#84cc16' : '#22c55e'};opacity:0.7;"></div>
	              <span style="font:7px var(--font-mono);color:var(--md-sys-color-outline);margin-top:2px;">${d.day.slice(0,2)}</span>
	            </div>`).join('')}</div>` : ''}
	        `;
	      }
	    } catch { /* skip */ }

	    // 2. Debt Score
	    try {
	      const ds = await api.get('/cognitive/debt-score');
	      const el = c.querySelector('#debt-score');
	      if (ds.score !== undefined) {
	        el.innerHTML = `
	          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">
	            <div style="font:700 2rem/1 var(--font-heading);color:${ds.color || '#84cc16'};">${ds.score}</div>
	            <div style="text-transform:uppercase;font:600 11px/1 var(--font-body);color:${ds.color || '#84cc16'};letter-spacing:0.08em;">${ds.level || 'clear'}</div>
	          </div>
	          <p style="margin:0;font-size:12px;line-height:1.5;">${ds.recommendation || ''}</p>
	        `;
	      }
	    } catch { /* skip */ }

	    // 3. Narrative Memory
	    try {
	      const nm = await api.get('/cognitive/narrative?period=week');
	      const el = c.querySelector('#narrative-memory');
	      if (nm.narrative) {
	        const n = nm.narrative;
	        el.innerHTML = `
	          <div style="margin-bottom:0.5rem;">
	            ${n.topCategories?.map(c => `<span class="chip" style="font-size:10px;margin-right:4px;">${c.name} ${c.percentage}%</span>`).join('') || ''}
	          </div>
	          ${nm.aiStory ? `<p style="margin:0 0 0.5rem;font-size:12px;line-height:1.6;color:var(--md-sys-color-on-surface-variant);">${nm.aiStory}</p>` : ''}
	          <div style="display:flex;gap:0.75rem;font-size:11px;color:var(--md-sys-color-outline);">
            <span><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">check_circle</span> ${n.commitments?.completed || 0}/${n.commitments?.total || 0}</span>
            <span><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">bar_chart</span> ${n.commitments?.fulfillmentRate || 0}%</span>
            ${n.peakTimes?.length ? `<span><span class="material-symbols-rounded" style="font-size:14px;vertical-align:middle;">schedule</span> ${n.peakTimes[0]}</span>` : ''}
	          </div>
	        `;
	      }
	    } catch { /* skip */ }

	    // 4. Commitment Probability
	    try {
	      const cp = await api.get('/cognitive/commitment-probability');
	      const el = c.querySelector('#commitment-prob');
	      if (cp.overallFulfillmentRate !== undefined) {
	        const color = cp.overallFulfillmentRate >= 70 ? '#22c55e' : cp.overallFulfillmentRate >= 40 ? '#f59e0b' : '#ef4444';
	        el.innerHTML = `
	          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">
	            <div style="font:700 2rem/1 var(--font-heading);color:${color};">${cp.overallFulfillmentRate}%</div>
	            <div style="flex:1;font-size:11px;color:var(--md-sys-color-on-surface-variant);">Today: <strong>${cp.todayProbability || cp.overallFulfillmentRate}%</strong></div>
	          </div>
	          <p style="margin:0 0 0.5rem;font-size:12px;line-height:1.5;">${cp.insight || ''}</p>
	          ${cp.worstDay ? `<div style="font-size:11px;color:var(--md-sys-color-outline);">Best day: ${cp.bestDay?.day || '—'} (${cp.bestDay?.rate || 0}%) · Worst: ${cp.worstDay.day} (${cp.worstDay.rate}%)</div>` : ''}
	        `;
	      }
	    } catch { /* skip */ }
	  }
	  loadCognitiveInsights();

	  // Digest button handler
  const digestBtn = c.querySelector('#digest-btn');
  const digestStatus = c.querySelector('#digest-status');
  if (digestBtn) {
    digestBtn.addEventListener('click', async () => {
      digestBtn.disabled = true;
      digestBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">sync</span> Sending...';
      digestStatus.textContent = 'Dispatching to your channels...';
      
      const res = await api.post('/channels/digest');
      if (res.error) {
        digestStatus.textContent = '❌ ' + res.error;
        digestStatus.style.color = 'var(--md-sys-color-error)';
      } else if (res.success) {
        digestStatus.textContent = res.message;
        digestStatus.style.color = 'var(--color-success)';
      } else {
        digestStatus.textContent = '⚠️ ' + (res.message || 'Digest could not be sent. Connect a channel first.');
        digestStatus.style.color = 'var(--md-sys-color-secondary)';
      }
      
      digestBtn.disabled = false;
      digestBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">send</span> Send Digest Now';
    });
  }
}
