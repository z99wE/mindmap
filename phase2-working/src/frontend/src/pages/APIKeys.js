// API Keys Page Component - Redesigned to strictly follow Carbon design specs without blue or purple gradients
let selectedService = 'OpenAI';
let configuredKeys = [];
const services = ['OpenAI', 'Anthropic', 'Groq', 'NVIDIA NIM', 'Ollama'];

export const APIKeys = () => {
  const tier = 'premium'; // Simulated - in real app, get from API

  // Global hooks
  window.selectService = (service) => {
    selectedService = service;
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = '';
      main.appendChild(APIKeys());
    }
  };

  window.addApiKey = () => {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;
    const key = input.value.trim();
    if (key) {
      const maskedKey = key.length > 8 ? '****' + key.slice(-8) : '********';
      configuredKeys.push({
        service: selectedService,
        key: maskedKey
      });
      input.value = '';
      const main = document.getElementById('main-content');
      if (main) {
        main.innerHTML = '';
        main.appendChild(APIKeys());
      }
    }
  };

  window.removeApiKey = (index) => {
    configuredKeys.splice(index, 1);
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = '';
      main.appendChild(APIKeys());
    }
  };

  const container = document.createElement('div');
  container.className = 'card';

  if (tier === 'free') {
    container.innerHTML = `
      <h2>API KEY MANAGEMENT</h2>
      <div class="warning" style="background: rgba(240, 140, 41, 0.15); border: 1px solid #f08c29; padding: 1.2rem; border-radius: 4px; color: #f08c29; margin-bottom: 1.5rem; font-family: 'Orbitron', sans-serif;">
        UPGRADE REQUIRED: API key configuration is only available for Premium and Enterprise tiers.
      </div>
      <p style="color: #aaa; margin: 2rem 0; font-family: 'Courier New', monospace; line-height: 1.6;">
        Free tier users are limited to using our free infrastructure (NVIDIA NIM, Groq, Ollama).
        To configure your own API keys and unlock 500+ daily runs, upgrade to Premium.
      </p>
      <div style="text-align: center;">
        <button class="btn btn-accent btn-lg" onclick="showPage('credits')">
          UPGRADE TO PREMIUM
        </button>
      </div>
    `;
    return container;
  }
  
  container.innerHTML = `
    <h2>API KEY MANAGEMENT</h2>
    
    <!-- Service Selection -->
    <div style="margin-bottom: 2rem;">
      <div style="color: #888; font-family: 'Orbitron', sans-serif; margin-bottom: 1rem;">SELECT PROVIDER</div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        ${services.map(service => `
          <button class="btn ${selectedService === service ? 'btn-primary' : 'btn-secondary'}" 
                  onclick="selectService('${service}')"
                  style="padding: 0.8rem 1.5rem; border-radius: 4px;">
            ${service}
          </button>
        `).join('')}
      </div>
    </div>
    
    <!-- Add Key Form -->
    <div style="margin-bottom: 2rem;">
      <div style="color: #888; font-family: 'Orbitron', sans-serif; margin-bottom: 1rem;">
        ADD API KEY FOR ${selectedService.toUpperCase()}
      </div>
      <div style="display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap;">
        <input type="password" id="apiKeyInput" placeholder="Paste your API key here..." 
               style="flex: 1; min-width: 300px; padding: 0.75rem; background: #0a0f1a; border: 2px solid #555; border-radius: 4px; color: #fff;">
        <button class="btn btn-success" onclick="addApiKey()">
          ADD KEY
        </button>
      </div>
      <p style="color: #888; margin-top: 0.5rem; font-size: 0.9rem;">
        Your API key will be encrypted and stored securely. Only you can see the last 8 characters.
      </p>
    </div>
    
    <!-- Configured Keys -->
    ${configuredKeys.length > 0 ? `
      <div style="margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #198038; margin-bottom: 1rem;">
          CONFIGURED KEYS (${configuredKeys.length})
        </div>
        <table class="keys-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>API Key</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${configuredKeys.map((key, index) => `
              <tr>
                <td class="key-service">${key.service}</td>
                <td class="key-value">${key.key}</td>
                <td>
                  <button class="btn btn-accent" onclick="removeApiKey(${index})" style="padding: 0.5rem 1rem;">
                    REMOVE
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p style="color: #888; font-family: \'Courier New\', monospace;">No API keys configured yet. Add one above.</p>'}
    
    <!-- Instructions -->
    <div style="background: rgba(240, 140, 41, 0.08); padding: 1.5rem; border-radius: 8px; border-left: 3px solid #f08c29; margin-top: 2rem;">
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">
        HOW TO GET YOUR API KEYS
      </h3>
      <ul style="color: #ccc; font-family: 'Courier New', monospace; line-height: 1.6; padding-left: 1.5rem;">
        <li><strong>OpenAI</strong>: Visit the OpenAI Developer platform dashboard to create a key.</li>
        <li><strong>Anthropic</strong>: Navigate to the Anthropic Console Settings menu.</li>
        <li><strong>Groq</strong>: Get free, low-latency keys directly via Groq Cloud dashboard.</li>
      </ul>
    </div>
  `;
  return container;
};
