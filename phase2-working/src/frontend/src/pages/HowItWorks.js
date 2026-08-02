// How It Works - Interactive demo with simulated messaging apps
export function HowItWorks() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="page-shell">
      <div class="surface-card card-reveal" style="padding:2rem;text-align:center;">
        <h1 style="font:var(--md-sys-typescale-headline-large);margin:0 0 0.5rem;">See Thought GPS in Action</h1>
        <p style="font:var(--md-sys-typescale-body-large);color:var(--md-sys-color-on-surface-variant);margin:0;max-width:600px;margin:0 auto;">
          Your cognitive features deliver through the apps you already use. Watch how nudges, briefs, and reviews arrive in real-time.
        </p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;margin-top:2rem;align-items:start;">

        <!-- Phone 1: WhatsApp - Thought Half-Life Escalation -->
        <div class="phone-mockup card-reveal">
          <div class="phone-header" style="background:#075e54;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <div style="width:32px;height:32px;border-radius:50%;background:#25d366;display:grid;place-items:center;">
                <span class="material-symbols-rounded" style="color:#fff;font-size:18px;">explore</span>
              </div>
              <div>
                <div style="color:#fff;font:600 14px/1.2 system-ui;">Thought GPS</div>
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
                <span class="material-symbols-rounded" style="color:#fff;font-size:18px;">smart_toy</span>
              </div>
              <div>
                <div style="color:#fff;font:600 14px/1.2 system-ui;">Thought GPS Bot</div>
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
                <div style="color:#fff;font:600 14px/1.2 system-ui;">#thought-gps</div>
                <div style="color:rgba(255,255,255,.7);font:11px/1.2 system-ui;">Slack</div>
              </div>
            </div>
          </div>
          <div class="phone-body" id="phone-3" style="background:#fff;min-height:340px;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;">
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="card-reveal" style="margin-top:2.5rem;text-align:center;padding:2rem;">
        <h2 style="font:var(--md-sys-typescale-headline-small);margin:0 0 0.5rem;">Try it yourself</h2>
        <p style="font:var(--md-sys-typescale-body-medium);color:var(--md-sys-color-on-surface-variant);margin:0 0 1.5rem;">
          Connect your channels in Mission Control and start receiving cognitive nudges where you already are.
        </p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn-m3 btn-filled" onclick="showPage('interactive-space')">
            <span class="material-symbols-rounded" style="font-size:18px;">chat</span> Open Chat
          </button>
          <button class="btn-m3 btn-tonal" onclick="showPage('mission-control')">
            <span class="material-symbols-rounded" style="font-size:18px;">settings_suggest</span> Mission Control
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
        ${msg.icon ? `<span class="material-symbols-rounded" style="font-size:14px;color:#0088cc;vertical-align:middle;">${msg.icon}</span>` : ''}
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
            <span class="material-symbols-rounded" style="color:#fff;font-size:11px;">smart_toy</span>
          </div>
          <span style="font:bold 11px/1 system-ui;color:#111;">Thought GPS</span>
          <span style="font:9px/1 system-ui;color:#999;">${msg.time}</span>
        </div>
        <div style="font:12px/1.5 system-ui;color:#333;">${msg.text}</div>
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
        bubble.innerHTML = renderBubble(msg, phone.style);
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

  return container;
}
