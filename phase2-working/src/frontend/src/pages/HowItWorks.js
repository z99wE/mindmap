// How It Works - Interactive demo with simulated messaging apps
export function HowItWorks() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;text-align:center;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">DEMO</div>
        <h1 style="font:700 2rem/1.1 'Space Grotesk',system-ui;letter-spacing:-0.06em;margin:0 0 0.5rem;">See ReMentally in Action</h1>
        <p style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);margin:0;max-width:600px;margin:0 auto;">
          Your cognitive navigator delivers through the apps you already use. Watch how nudges, briefs, and route updates arrive in real-time.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;margin-top:2rem;align-items:start;">

        <!-- Phone 1: WhatsApp - Thought Half-Life Escalation -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#075e54;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:50%;background:#ccff00;display:grid;place-items:center;">
                <span style="color:#000;font:700 14px/1 'Space Grotesk';">R</span>
              </div>
              <div>
                <div style="color:#fff;font:600 14px/1.2 system-ui;">ReMentally</div>
                <div style="color:rgba(255,255,255,.7);font:11px/1.2 system-ui;">WhatsApp</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-1" style="background:#ece5dd;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
          <div style="padding:0.5rem 1rem;background:#ece5dd;border-top:1px solid rgba(0,0,0,.1);">
            <div class="decay-bar medium" style="height:3px;"></div>
          </div>
        </div>

        <!-- Phone 2: Telegram - Departure Brief + Invisible Checklist -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#2b5278;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:50%;background:#0088cc;display:grid;place-items:center;">
                <span style="color:#fff;font:700 14px/1 'Space Grotesk';">R</span>
              </div>
              <div>
                <div style="color:#fff;font:600 14px/1.2 system-ui;">ReMentally Bot</div>
                <div style="color:rgba(255,255,255,.7);font:11px/1.2 system-ui;">Telegram</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-2" style="background:#e8ecef;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
        </div>

        <!-- Phone 3: Slack - Commitment Witness + Archaeology -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#4a154b;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:6px;background:#611f69;display:grid;place-items:center;">
                <span style="color:#fff;font:bold 14px/1 system-ui;">#</span>
              </div>
              <div>
                <div style="color:#fff;font:600 14px/1.2 system-ui;">#rementally</div>
                <div style="color:rgba(255,255,255,.7);font:11px/1.2 system-ui;">Slack</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-3" style="background:#fff;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
        </div>

        <!-- Phone 4: ReMentally - Navigation Mode -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#0c0c0c;border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:50%;background:#ccff00;display:grid;place-items:center;">
                <span style="color:#000;font:700 14px/1 'Space Grotesk';">R</span>
              </div>
              <div>
                <div style="color:#ebebeb;font:600 14px/1.2 'Space Grotesk',system-ui;">ReMentally</div>
                <div style="color:rgba(235,235,235,.5);font:11px/1 var(--font-mono),monospace;text-transform:uppercase;">Navigate</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-4" style="background:#0a0a0a;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
        </div>

        <!-- Phone 5: ReMentally - Geo-fence Departure Alert -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#0c0c0c;border-bottom:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:50%;background:#10b981;display:grid;place-items:center;">
                <span style="color:#fff;font:700 14px/1 'Space Grotesk';">R</span>
              </div>
              <div>
                <div style="color:#ebebeb;font:600 14px/1.2 'Space Grotesk',system-ui;">ReMentally</div>
                <div style="color:rgba(235,235,235,.5);font:11px/1 var(--font-mono),monospace;text-transform:uppercase;">Push</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-5" style="background:#0a0a0a;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
        </div>
        <!-- Phone 6: Email / Browser - Daily Digests -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#ea4335;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:50%;background:#fff;display:grid;place-items:center;">
                <span style="color:#ea4335;font:700 14px/1 'Space Grotesk';">✉️</span>
              </div>
              <div>
                <div style="color:#fff;font:600 14px/1.2 system-ui;">rementally-email</div>
                <div style="color:rgba(255,255,255,.7);font:11px/1.2 system-ui;">Email / Browser</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-6" style="background:#f8f9fa;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="card-reveal surface-card" style="margin-top:2.5rem;text-align:center;padding:2rem;">
        <h2 style="font:700 1.5rem/1.2 'Space Grotesk',system-ui;letter-spacing:-0.04em;margin:0 0 0.5rem;">Start navigating your thoughts</h2>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1.5rem;">
          Connect your channels in Mission Control and start receiving cognitive nudges where you already are.
        </p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn-neon" onclick="showPage('interactive-space')">
            Open Chat
          </button>
          <button class="btn-m3 btn-tonal" onclick="showPage('mission-control')">
            Mission Control
          </button>
        </div>
      </div>
    </div>`;

  // Message data for each phone
  const phone1Messages = [
    { text: 'Gentle reminder: Call Dr. Mehta about blood test', time: '10:30 AM', tier: 1, decay: 85 },
    { text: "Still relevant? You said 'I need to call Dr. Mehta' 3 days ago", time: '2:15 PM', tier: 2, decay: 40 },
    { text: "This thought has expired. Reply 'archive' to clear it, or take action now.", time: '6:00 PM', tier: 3, decay: 0 },
  ];

  const phone2Messages = [
    { text: '<strong>Leaving now?</strong> Top 3 tasks:<br>1. Eggs — wife asked yesterday<br>2. Pay electricity bill — due today<br>3. Call Dr. Mehta', time: '8:45 AM', icon: 'directions_walk' },
    { text: '☂️ Umbrella — 72% rain today', time: '8:45 AM', icon: 'cloud' },
    { text: "📍 You're near D-Mart:<br>1. Eggs (wife asked)<br>2. Toothpaste<br>3. Birthday candles — Saurav's bday Friday", time: '11:20 AM', icon: 'location_on' },
  ];

  const phone3Messages = [
    { text: '<strong>Commitment detected:</strong> "I\'ll finish the report by Friday 5pm"<br>Want me to quietly let someone know?', time: '9:00 AM', isBot: true },
    { text: 'Yes, tell Priya', time: '9:02 AM', isUser: true },
    { text: '<strong>Your week in thoughts:</strong><br>🏥 Health: 2 thoughts didn\'t move<br>💰 Finance: 1 thought didn\'t move<br><br>The one worth revisiting: <em>Call Dr. Mehta about blood test</em><br><br>Reply \'show me\' or \'clear\'.', time: 'Sun 8:00 PM', isBot: true },
  ];

  const phone4Messages = [
    { type: 'route-summary', text: "Today's route: 8 thoughts, 3 themes, 2 urgent", time: '9:00 AM' },
    { type: 'thought-node', theme: 'Health', color: '#ccff00', text: 'Call Dr. Mehta about blood test', urgency: 'critical', halfLife: '4h' },
    { type: 'thought-node', theme: 'Health', color: '#ccff00', text: 'Schedule annual checkup', urgency: 'normal', halfLife: '72h' },
    { type: 'thought-node', theme: 'Finance', color: '#10b981', text: 'Pay electricity bill — due today', urgency: 'high', halfLife: '2h' },
    { type: 'navigate', text: 'Navigating: 3 themes to review. Swipe through your route.', step: '1 / 8' },
  ];

  const phone5Messages = [
    { type: 'geo-alert', icon: 'location_away', color: '#10b981', title: 'Leaving Home Zone', text: 'Departure detected at 8:42 AM', time: '8:42 AM' },
    { type: 'brief', items: ['Eggs — wife asked yesterday', 'Pay electricity bill — due today', 'Call Dr. Mehta — 3 days overdue'], heading: 'Departure Brief' },
    { type: 'nearby', icon: 'near_me', text: "You're near D-Mart", items: ['Eggs (wife asked)', 'Toothpaste', 'Birthday candles — Saurav\'s bday Fri'], time: '11:20 AM' },
  ];

  const phone6Messages = [
    { text: '<strong>Weekly Cognitive Digest</strong><br>You successfully closed 80% of open loops this week.<br>Top lingering theme: <em>Household chores</em>.', time: 'Fri 5:00 PM', icon: 'email' },
    { text: '⚠️ Your API key for Groq is missing. Add it in settings to enable LLM features.', time: 'System Alert', icon: 'warning' },
    { text: 'Browser Notification: <em>You have 3 thoughts nearing decay.</em>', time: 'Just now', icon: 'notifications' }
  ];

  function renderBubble(msg, style) {
    const tierColors = { 1: '#4caf50', 2: '#ff9800', 3: '#f44336' };
    const tierLabels = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Expired' };

    if (style === 'whatsapp') {
      return `<div class="phone-bubble incoming" style="max-width:85%;">
        <div style="font:12px/1.5 system-ui;color:#111;">${msg.text}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font:9px/1 system-ui;color:#999;">${msg.time}</span>
          ${msg.tier ? `<span style="font:8px/1 system-ui;color:${tierColors[msg.tier]};background:${tierColors[msg.tier]}15;padding:1px 6px;border-radius:8px;">${tierLabels[msg.tier]}</span>` : ''}
        </div>
        ${msg.decay != null ? `<div style="height:2px;margin-top:4px;border-radius:1px;background:#ddd;overflow:hidden;"><div style="height:100%;width:${msg.decay}%;background:${tierColors[msg.tier]};"></div></div>` : ''}
      </div>`;
    }
    if (style === 'telegram') {
      return `<div class="phone-bubble incoming" style="max-width:85%;border-radius:12px 12px 12px 4px;">
        ${msg.icon ? `<span style="font:9px/1 var(--font-mono);color:#0088cc;text-transform:uppercase;">${msg.icon}</span>` : ''}
        <div style="font:12px/1.5 system-ui;color:#111;margin-top:2px;">${msg.text}</div>
        <span style="font:9px/1 system-ui;color:#999;display:block;text-align:right;margin-top:2px;">${msg.time}</span>
      </div>`;
    }
    if (style === 'slack') {
      if (msg.isUser) {
        return `<div style="padding:0.4rem 0.6rem;background:#e8f5e9;border-radius:6px;max-width:70%;align-self:flex-end;">
          <div style="font:11px/1.4 system-ui;color:#111;">${msg.text}</div>
          <span style="font:9px/1 system-ui;color:#999;">${msg.time}</span>
        </div>`;
      }
      return `<div style="padding:0.5rem 0.6rem;border-left:3px solid #611f69;max-width:90%;">
        <div style="display:flex;align-items:center;gap:0.35rem;margin-bottom:0.25rem;">
          <div style="width:18px;height:18px;border-radius:4px;background:#611f69;display:grid;place-items:center;">
            <span style="color:#fff;font:700 9px/1 'Space Grotesk';">R</span>
          </div>
          <span style="font:bold 11px/1 system-ui;color:#111;">ReMentally</span>
          <span style="font:9px/1 system-ui;color:#999;">${msg.time}</span>
        </div>
        <div style="font:12px/1.5 system-ui;color:#333;">${msg.text}</div>
      </div>`;
    }
    if (style === 'email') {
      return `<div style="padding:0.6rem;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #ea4335;">
        ${msg.icon ? `<span style="font:12px/1 var(--font-mono);color:#ea4335;display:inline-block;margin-bottom:4px;">${msg.icon}</span>` : ''}
        <div style="font:12px/1.5 system-ui;color:#333;">${msg.text}</div>
        <div style="font:10px/1 system-ui;color:#999;margin-top:6px;text-align:right;">${msg.time}</div>
      </div>`;
    }
    return '';
  }

  function renderMapMindMsg(msg) {
    if (msg.type === 'route-summary') {
      return `<div style="padding:0.6rem 0.75rem;border-radius:12px;background:rgba(204,255,0,0.1);border:1px solid rgba(204,255,0,0.2);">
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span class="mono-label" style="color:#ccff00;font-size:9px;">ROUTE</span>
          <span style="font:600 12px/1.3 'Space Grotesk',system-ui;color:#ebebeb;">${msg.text}</span>
        </div>
        <span style="font:9px/1 var(--font-mono),monospace;color:rgba(235,235,235,.4);display:block;margin-top:4px;">${msg.time}</span>
      </div>`;
    }
    if (msg.type === 'thought-node') {
      const urgColor = msg.urgency === 'critical' ? '#f44336' : msg.urgency === 'high' ? '#ff9800' : 'rgba(235,235,235,.4)';
      return `<div style="padding:0.5rem 0.65rem;border-radius:10px;background:rgba(255,255,255,0.03);border-left:3px solid ${urgColor};">
        <div style="display:flex;align-items:center;gap:0.35rem;margin-bottom:3px;">
          <div style="width:7px;height:7px;border-radius:50%;background:${msg.color};"></div>
          <span style="font:8px/1 var(--font-mono),monospace;color:${msg.color};text-transform:uppercase;">${msg.theme}</span>
        </div>
        <div style="font:12px/1.4 system-ui;color:#ebebeb;">${msg.text}</div>
        <div style="display:flex;gap:0.35rem;margin-top:4px;">
          <span style="font:8px/1 var(--font-mono),monospace;color:${urgColor};text-transform:uppercase;">${msg.urgency}</span>
          <span style="font:8px/1 var(--font-mono),monospace;color:rgba(235,235,235,.3);">${msg.halfLife}</span>
        </div>
      </div>`;
    }
    if (msg.type === 'navigate') {
      return `<div style="padding:0.6rem 0.75rem;border-radius:12px;background:rgba(204,255,0,0.15);border:1px solid rgba(204,255,0,0.3);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font:600 11px/1.3 system-ui;color:#ccff00;">${msg.text}</span>
          <span style="font:9px/1 var(--font-mono),monospace;color:rgba(235,235,235,.4);">${msg.step}</span>
        </div>
      </div>`;
    }
    return '';
  }

  function renderGeoFenceMsg(msg) {
    if (msg.type === 'geo-alert') {
      return `<div style="padding:0.6rem 0.75rem;border-radius:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);">
        <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:4px;">
          <span class="mono-label" style="color:${msg.color};font-size:9px;">${(msg.icon || 'GEO').toUpperCase()}</span>
          <span style="font:600 12px/1.3 'Space Grotesk',system-ui;color:#ebebeb;">${msg.title}</span>
        </div>
        <div style="font:11px/1.4 system-ui;color:rgba(235,235,235,.6);">${msg.text}</div>
        <span style="font:9px/1 var(--font-mono),monospace;color:rgba(235,235,235,.3);display:block;margin-top:4px;">${msg.time}</span>
      </div>`;
    }
    if (msg.type === 'brief') {
      return `<div style="padding:0.6rem 0.75rem;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
        <div class="mono-label" style="color:#ccff00;font-size:9px;margin-bottom:6px;text-transform:uppercase;">${msg.heading}</div>
        ${msg.items.map((item, i) => `<div style="display:flex;gap:0.35rem;align-items:baseline;margin-bottom:3px;">
          <span style="font:9px/1 var(--font-mono),monospace;color:rgba(235,235,235,.3);">${i + 1}.</span>
          <span style="font:11px/1.4 system-ui;color:#ebebeb;">${item}</span>
        </div>`).join('')}
      </div>`;
    }
    if (msg.type === 'nearby') {
      return `<div style="padding:0.6rem 0.75rem;border-radius:12px;background:rgba(204,255,0,0.08);border:1px solid rgba(204,255,0,0.2);">
        <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:6px;">
          <span class="mono-label" style="color:#ccff00;font-size:9px;">${(msg.icon || 'NEAR').toUpperCase()}</span>
          <span style="font:600 11px/1.3 system-ui;color:#a3e635;">${msg.text}</span>
        </div>
        ${msg.items.map((item, i) => `<div style="font:11px/1.5 system-ui;color:rgba(235,235,235,.7);padding-left:0.5rem;border-left:2px solid rgba(204,255,0,0.2);margin-bottom:3px;">${item}</div>`).join('')}
        <span style="font:9px/1 var(--font-mono),monospace;color:rgba(235,235,235,.3);display:block;margin-top:4px;">${msg.time}</span>
      </div>`;
    }
    return '';
  }

  function renderTyping() {
    return `<div class="phone-bubble incoming typing-indicator" style="max-width:60px;padding:8px 12px;">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  }

  // Animate messages
  const phones = [
    { el: container.querySelector('#phone-1'), msgs: phone1Messages, style: 'whatsapp' },
    { el: container.querySelector('#phone-2'), msgs: phone2Messages, style: 'telegram' },
    { el: container.querySelector('#phone-3'), msgs: phone3Messages, style: 'slack' },
    { el: container.querySelector('#phone-4'), msgs: phone4Messages, style: 'mapmind' },
    { el: container.querySelector('#phone-5'), msgs: phone5Messages, style: 'geofence' },
    { el: container.querySelector('#phone-6'), msgs: phone6Messages, style: 'email' },
  ];

  let animTimer = null;
  function runAnimation() {
    phones.forEach(p => { p.el.innerHTML = ''; p.index = 0; });

    function showNext(phone) {
      if (phone.index >= phone.msgs.length) return;
      // Show typing
      const typing = document.createElement('div');
      typing.innerHTML = renderTyping();
      phone.el.appendChild(typing.firstElementChild);
      phone.el.scrollTop = phone.el.scrollHeight;

      setTimeout(() => {
        // Remove typing, show message
        phone.el.querySelector('.typing-indicator')?.remove();
        const msg = phone.msgs[phone.index];
        const bubble = document.createElement('div');
        let html = '';
        if (phone.style === 'mapmind') html = renderMapMindMsg(msg);
        else if (phone.style === 'geofence') html = renderGeoFenceMsg(msg);
        else html = renderBubble(msg, phone.style);
        bubble.innerHTML = html;
        const el = bubble.firstElementChild;
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        phone.el.appendChild(el);
        requestAnimationFrame(() => {
          el.style.transition = 'opacity 0.3s, transform 0.3s';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
        phone.el.scrollTop = phone.el.scrollHeight;
        phone.index++;
        setTimeout(() => showNext(phone), 1200);
      }, 800);
    }

    phones.forEach((p, i) => setTimeout(() => showNext(p), i * 400));
  }

  runAnimation();
  animTimer = setInterval(runAnimation, 20000);

  // Cleanup on page change
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      clearInterval(animTimer);
      observer.disconnect();
    }
  });
  observer.observe(document.getElementById('main-content') || document.body, { childList: true });

  // ── Benefits Section (below the demo) ──────────────────────────────
  const benefitsSection = document.createElement('div');
  benefitsSection.innerHTML = `
    <div style="margin-top:3rem;">
      <div class="surface-card card-reveal" style="padding:2rem;text-align:center;margin-bottom:2rem;">
        <div class="mono-label" style="color:var(--md-sys-color-primary);margin-bottom:0.5rem;">WHY IT MATTERS</div>
        <h2 style="font:var(--md-sys-typescale-headline-medium);margin:0 0 0.5rem;">Built for How Your Brain Actually Works</h2>
        <p style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);max-width:600px;margin:0 auto;">
          Not another to-do list. ReMentally understands that thoughts fade, commitments need accountability, and your brain processes differently than everyone else's.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;">
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">timer</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Thoughts Fade Automatically</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Your forgetting curve is personalized. Urgent thoughts escalate. Low-priority ideas fade naturally. No more mental clutter.
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">groups</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Accountability That Works</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Set a witness contact. Miss a deadline? They get notified. Users with witnesses complete 72% more commitments.
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">psychology</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Learns Your Patterns</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Tracks when you're productive, which categories you follow through on, and predicts overload before you feel it.
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">bolt</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Energy-Aware Scheduling</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Complex tasks during peak hours. Easy wins during dips. Matches difficulty to your actual energy level.
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">grading</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Thought Quality Coaching</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Rates your thoughts A-F and coaches you to write more actionable ones. Specific thoughts with deadlines complete 2x more often.
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">notifications_active</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Proactive Insights</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Don't wait to ask. The app pushes insights when patterns emerge: "You've been thinking about this for 5 days. Here's what you've collected."
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">account_tree</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Thought Chains</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            Detects logical sequences: "Write proposal" suggests "Send proposal" suggests "Follow up." Auto-suggests next steps.
          </p>
        </div>
        <div class="surface-card card-reveal" style="padding:1.5rem;">
          <span class="material-symbols-rounded" style="font-size:2rem;color:var(--md-sys-color-primary);margin-bottom:0.75rem;display:block;">groups_3</span>
          <h3 style="font:var(--md-sys-typescale-title-medium);margin:0 0 0.5rem;">Social Proof Intelligence</h3>
          <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0;">
            "Users with deadlines complete 87% more." Anonymized aggregate insights from all users. The more people use it, the smarter it gets.
          </p>
        </div>
      </div>
    </div>
  `;
  container.appendChild(benefitsSection);

  // Trigger card reveal
  setTimeout(() => {
    benefitsSection.querySelectorAll('.card-reveal').forEach((card, i) => {
      setTimeout(() => card.classList.add('revealed'), i * 80);
    });
  }, 100);

  return container;
}
