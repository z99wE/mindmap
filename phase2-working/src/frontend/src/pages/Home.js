// Home Page Component with high-fidelity Carbon-inspired VC pitch, Problem statement, interactive features, and animations
export const Home = () => {
  const container = document.createElement('div');
  container.className = 'home-pitch-container';
  
  container.innerHTML = `
    <!-- Hero Pitch Section -->
    <section class="hero-section">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="brand-eyebrow">COGNITIVE COPROCESSOR</div>
        <h1 class="hero-headline glitch-text">Your Mind Was Never Meant to Remember Everything.</h1>
        <h2 class="hero-subheadline">Thought GPS maps your ideas, remembers context, researches the web, coordinates AI agents, and guides you from scattered thoughts to finished work.</h2>
        
        <div class="hero-cta-group">
          <button class="btn btn-primary btn-lg" onclick="showPage('interactive-space')">Start Navigating</button>
          <button class="btn btn-secondary btn-lg" onclick="showPage('dashboard')">See Mission Control</button>
        </div>
        
        <!-- Interactive Telemetry Feed -->
        <div class="telemetry-ticker">
          <span class="telemetry-pulse"></span>
          <span class="telemetry-text" id="telemetry-feed">Thinking...</span>
        </div>
      </div>
    </section>

    <!-- Alternative Headlines Marquee (Fundable Positioning) -->
    <section class="value-prop-strip">
      <div class="marquee-wrapper">
        <div class="marquee-content">
          <span>Navigate ideas like Google Maps navigates roads.</span>
          <span class="divider">//</span>
          <span>AI That Understands Where Your Thinking Is Going.</span>
          <span class="divider">//</span>
          <span>Stop Searching. Start Navigating.</span>
          <span class="divider">//</span>
          <span>Your second brain finally has directions.</span>
        </div>
      </div>
    </section>

    <!-- The Problem (ADHD & Cognitive Friction) -->
    <section class="problem-solution-section">
      <div class="grid-2col">
        <div class="problem-block">
          <div class="section-label text-warning">THE INEFFICIENCY GRID</div>
          <h3 class="section-heading">Your Brain Isn't the Bottleneck. <br><span class="text-orange">Navigation Is.</span></h3>
          <p class="section-body">Most AI forgets. Most note-taking apps just collect. Most productivity tools make you organize everything yourself. Your brain ends up doing all the navigation.</p>
          <div class="problem-list">
            <div class="problem-item">
              <span class="cross-icon"></span>
              <div>
                <strong>The ADHD Tax:</strong> Out-of-sight, out-of-mind. Static files disappear from focus.
              </div>
            </div>
            <div class="problem-item">
              <span class="cross-icon"></span>
              <div>
                <strong>Context Fragmentation:</strong> Switching platforms drops details.
              </div>
            </div>
            <div class="problem-item">
              <span class="cross-icon"></span>
              <div>
                <strong>Information Stagnation:</strong> Note lists accumulate clutter instead of driving execution.
              </div>
            </div>
          </div>
        </div>
        
        <div class="solution-block">
          <div class="section-label text-success">THE COGNITIVE RESOLUTION</div>
          <h3 class="section-heading">You don't need another notebook. <br><span class="text-green">You need a navigation system.</span></h3>
          <p class="section-body">Thought GPS integrates vector persistence, OSRM physical transport awareness, and automated channels to build a zero-friction second brain.</p>
          
          <div class="solution-grid">
            <div class="solution-card">
              <div class="sol-num">01</div>
              <h4>Designed for Non-Linear Minds</h4>
              <p>Your thoughts aren't messy—they're multidimensional. Follow them instead of fighting them.</p>
            </div>
            <div class="solution-card">
              <div class="sol-num">02</div>
              <h4>Zero-Friction Capture</h4>
              <p>WhatsApp, Signal, and Web widgets feed a single pgvector Knowledge Graph instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works (Thought to Direction Lobe) -->
    <section class="how-it-works-section">
      <div class="section-header-centered">
        <div class="section-label">WORKFLOW PIPELINE</div>
        <h2 class="section-heading">From Thought &rarr; Direction</h2>
      </div>
      
      <div class="pipeline-grid">
        <div class="pipeline-step">
          <div class="step-badge">CAPTURE</div>
          <p class="step-desc">Type. Speak. Paste. Every thought becomes a node.</p>
        </div>
        <div class="pipeline-step">
          <div class="step-badge">UNDERSTAND</div>
          <p class="step-desc">AI extracts meaning instead of keywords. Relationships appear automatically.</p>
        </div>
        <div class="pipeline-step">
          <div class="step-badge">RESEARCH</div>
          <p class="step-desc">Searches the web in real time. Adds evidence. Removes hallucinations.</p>
        </div>
        <div class="pipeline-step">
          <div class="step-badge">REMEMBER</div>
          <p class="step-desc">Every conversation becomes connected memory. Nothing disappears.</p>
        </div>
        <div class="pipeline-step">
          <div class="step-badge">NAVIGATE</div>
          <p class="step-desc">Jump between ideas. See where your thinking leads.</p>
        </div>
        <div class="pipeline-step">
          <div class="step-badge">EXECUTE</div>
          <p class="step-desc">Launch AI agents. Generate work. Complete tasks.</p>
        </div>
      </div>
    </section>

    <!-- Structural Comparison -->
    <section class="comparison-section">
      <div class="section-header-centered">
        <div class="section-label">SYSTEM ARCHITECTURE</div>
        <h2 class="section-heading">Stop Managing Information. Start Using It.</h2>
      </div>
      
      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>TRADITIONAL APPLICATIONS</th>
              <th class="accent-header">THOUGHT GPS COPROCESSOR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Remember where things are.</td>
              <td class="success-row">Remember why they matter.</td>
            </tr>
            <tr>
              <td>Search files.</td>
              <td class="success-row">Navigate ideas.</td>
            </tr>
            <tr>
              <td>Store information.</td>
              <td class="success-row">Grow intelligence.</td>
            </tr>
            <tr>
              <td>Folders, lists, static files.</td>
              <td class="success-row">Asymmetric knowledge maps.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Attention/ADHD Benefits Grid -->
    <section class="benefits-section">
      <div class="grid-2col">
        <div>
          <div class="section-label">ATTENTION DYNAMICS</div>
          <h3 class="section-heading">Designed For Brains That Don't Think In Straight Lines.</h3>
          <p class="section-body">Instead of folders, you get maps. Instead of history, you get context. Instead of search, you get navigation.</p>
        </div>
        <div class="benefits-grid">
          <div class="benefit-item">Reduce cognitive overload</div>
          <div class="benefit-item">Never lose ideas</div>
          <div class="benefit-item">Lower task switching</div>
          <div class="benefit-item">Visual thinking</div>
          <div class="benefit-item">Capture before forgetting</div>
          <div class="benefit-item">Reconnect forgotten thoughts</div>
          <div class="benefit-item">Reduce mental fatigue</div>
          <div class="benefit-item">Finish more work</div>
          <div class="benefit-item">Stay in flow</div>
        </div>
      </div>
    </section>

    <!-- Features Overview -->
    <section class="features-grid-section">
      <div class="section-header-centered">
        <div class="section-label">PLATFORM MODES</div>
        <h2 class="section-heading">The Cognitive Command Grid</h2>
      </div>
      
      <div class="features-grid">
        <div class="feat-card" onclick="showPage('mission-control')">
          <h5>Mission Control</h5>
          <p>Every AI, memory, and channel monitored in a single centralized command center.</p>
        </div>
        <div class="feat-card" onclick="showPage('brain-fragments')">
          <h5>Knowledge Graph</h5>
          <p>Evolving semantic relationships connecting creative, analytical, and emotional thoughts.</p>
        </div>
        <div class="feat-card" onclick="showPage('interactive-space')">
          <h5>Live Web Search</h5>
          <p>Reality before reasoning. Ground thoughts with real-time duckduckgo/searxng scraping.</p>
        </div>
        <div class="feat-card" onclick="showPage('dashboard')">
          <h5>Multi-Agent AI</h5>
          <p>Coordinated specialists for writing, research, and analysis tasks working as one.</p>
        </div>
        <div class="feat-card" onclick="showPage('memory')">
          <h5>Persistent Memory</h5>
          <p>Portable JSON-LD exports keeping your neural network compatible and yours forever.</p>
        </div>
        <div class="feat-card" onclick="showPage('cognitive-load')">
          <h5>ADHD Task Decayer</h5>
          <p>Half-life tracking that escalates tasks before they expire from working memory.</p>
        </div>
      </div>
    </section>

    <!-- Brand Footer Pitch -->
    <section class="brand-footer-pitch">
      <h3 class="tagline">Less remembering. <br><span class="text-orange">More thinking.</span></h3>
    </section>
  `;

  // Telemetry loop for floating notifications simulator
  const telemetryMsgs = [
    "Thinking...",
    "Connecting ideas...",
    "Searching reality...",
    "Finding patterns...",
    "Updating memory...",
    "Calculating next step...",
    "Memory linked.",
    "Thought mapped.",
    "Research complete.",
    "Connection discovered."
  ];
  let telemetryIndex = 0;
  const intervalId = setInterval(() => {
    const feed = container.querySelector('#telemetry-feed');
    if (feed) {
      telemetryIndex = (telemetryIndex + 1) % telemetryMsgs.length;
      feed.textContent = telemetryMsgs[telemetryIndex];
    } else {
      clearInterval(intervalId);
    }
  }, 3000);

  return container;
};
