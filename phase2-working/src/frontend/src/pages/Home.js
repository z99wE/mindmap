// Home Page Component
export const Home = () => {
  return `
    <div class="card">
      <h2 class="glitch">SCIENCE FICTION CONSCIOUSNESS PLATFORM</h2>
      
      <div style="text-align: center; margin-bottom: 3rem;">
        <h1 style="font-family: 'Orbitron', sans-serif; color: #00d2ff; text-shadow: 0 0 30px #00d2ff; font-size: 4rem; margin-bottom: 1rem;">
          THOUGHT GPS
        </h1>
        <p style="color: #ff3366; font-size: 1.5rem; text-shadow: 0 0 15px #ff3366;">
          NEXT-GENERATION AI AGENT INTERFACE
        </p>
      </div>
      
      <div style="display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem;">
        <button class="btn btn-primary" onclick="showPage('dashboard')" style="padding: 1.2rem 2.5rem; font-size: 1.2rem;">
          ACCESS SYSTEM DASHBOARD
        </button>
        <button class="btn btn-accent" onclick="showPage('api-keys')" style="padding: 1.2rem 2.5rem; font-size: 1.2rem;">
          CONFIGURE API KEYS
        </button>
        <button class="btn btn-success" onclick="showPage('credits')" style="padding: 1.2rem 2.5rem; font-size: 1.2rem;">
          CREDIT MANAGEMENT
        </button>
      </div>
      
      <div style="display: flex; justify-content: center; gap: 4rem; flex-wrap: wrap; margin-top: 3rem; text-align: center;">
        <div>
          <div style="color: #39ff14; text-shadow: 0 0 10px #39ff14; font-family: 'Orbitron', sans-serif;">SYSTEM STATUS</div>
          <div style="color: #fff; font-size: 1.2rem; margin-top: 0.5rem;">ONLINE</div>
          <div style="color: #888; font-size: 0.9rem; margin-top: 0.2rem;">UPTIME: 99.999%</div>
        </div>
        <div>
          <div style="color: #00d2ff; text-shadow: 0 0 10px #00d2ff; font-family: 'Orbitron', sans-serif;">RESPONSE TIME</div>
          <div id="response-time" style="color: #fff; font-family: 'Courier New', monospace; font-size: 1.2rem; margin-top: 0.5rem;">0ms</div>
        </div>
        <div>
          <div style="color: #ff3366; text-shadow: 0 0 10px #ff3366; font-family: 'Orbitron', sans-serif;">CURRENT VERSION</div>
          <div style="color: #fff; font-size: 1.2rem; margin-top: 0.5rem;">V1.1.0</div>
        </div>
      </div>
      
      <div style="margin-top: 3rem; background: rgba(0, 210, 255, 0.1); padding: 1.5rem; border-radius: 8px; border-left: 3px solid #00d2ff;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #00d2ff; margin-bottom: 1rem;">FEATURE HIGHLIGHTS</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
          <div><strong style="color: #fff;">6-Channel Support</strong>: WhatsApp, Telegram, Slack, Discord, Signal, Email</div>
          <div><strong style="color: #fff;">Multimodal Processing</strong>: Voice, Image, Text inputs</div>
          <div><strong style="color: #fff;">Intelligent LLM Router</strong>: 5-level fallback chain</div>
          <div><strong style="color: #fff;">3-Tier Access Control</strong>: Free, Premium, Enterprise</div>
          <div><strong style="color: #fff;">Voice Output Engine</strong>: TTS support for premium users</div>
          <div><strong style="color: #fff;">Memory Management</strong>: 4-layer memory architecture</div>
        </div>
      </div>
    </div>
  `;
};
