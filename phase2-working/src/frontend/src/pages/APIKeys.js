// API Keys Component
let selectedService = 'OpenAI';
let configuredKeys = [];

const services = ['OpenAI', 'Anthropic', 'Groq', 'NVIDIA NIM', 'Ollama'];

export const APIKeys = () => {
  const tier = 'premium'; // Simulated - in real app, get from API
  
  if (tier === 'free') {
    return `
      <div class="card">
        <h2>API KEY MANAGEMENT</h2>
        <div class="warning">
          ⚠️ UPGRADE REQUIRED: API key configuration is only available for Premium and Enterprise tiers.
        </div>
        <p style="color: #aaa; margin: 2rem 0;">
          Free tier users are limited to using our free infrastructure (NVIDIA NIM, Groq, Ollama).
          To configure your own API keys and unlock 500+ daily runs, upgrade to Premium.
        </p>
        <div style="text-align: center;">
          <button class="btn btn-accent" onclick="showPage('credits')" style="padding: 1rem 2rem; font-size: 1.2rem;">
            UPGRADE TO PREMIUM
          </button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="card">
      <h2>API KEY MANAGEMENT</h2>
      
      <!-- Service Selection -->
      <div style="margin-bottom: 2rem;">
        <div style="color: #888; font-family: 'Orbitron', sans-serif; margin-bottom: 1rem;">SELECT PROVIDER</div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          ${services.map(service => `
            <button class="btn ${selectedService === service ? 'btn-primary' : ''}" 
                    onclick="selectService('${service}')"
                    style="padding: 0.8rem 1.5rem; ${selectedService === service ? 'background: #00d2ff; color: #000;' : ''}">
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
                 style="flex: 1; min-width: 300px;">
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
          <div style="font-family: 'Orbitron', sans-serif; color: #39ff14; margin-bottom: 1rem;">
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
                    <button class="btn" onclick="removeApiKey(${index})" style="background: #ff3366; color: #fff; padding: 0.5rem 1rem;">
                      REMOVE
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="color: #888;">No API keys configured yet. Add one above.</p>'}
      
      <!-- Instructions -->
      <div style="background: rgba(0, 210, 255, 0.1); padding: 1.5rem; border-radius: 8px; border-left: 3px solid #00d2ff; margin-top: 2rem;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #00d2ff; margin-bottom: 1rem;">
          HOW TO GET YOUR API KEYS
        </h3>
        <div style="color: #aaa; line-height: 1.8;">
          <p><strong style="color: #fff;">OpenAI:</strong> Visit <a href="https://platform.openai.com/api-keys" style="color: #00d2ff;">platform.openai.com/api-keys</a></p>
          <p><strong style="color: #fff;">Anthropic:</strong> Visit <a href="https://console.anthropic.com/settings/keys" style="color: #00d2ff;">console.anthropic.com/settings/keys</a></p>
          <p><strong style="color: #fff;">Groq:</strong> Visit <a href="https://console.groq.com/keys" style="color: #00d2ff;">console.groq.com/keys</a></p>
          <p><strong style="color: #fff;">NVIDIA NIM:</strong> Free tier available at <a href="https://build.nvidia.com/" style="color: #00d2ff;">build.nvidia.com</a></p>
          <p><strong style="color: #fff;">Ollama:</strong> Install locally from <a href="https://ollama.ai/" style="color: #00d2ff;">ollama.ai</a></p>
        </div>
      </div>
    </div>
    
    <script>
      window.selectService = (service) => {
        selectedService = service;
        document.querySelector('#main-content').innerHTML = APIKeys();
      };
      
      window.addApiKey = () => {
        const input = document.getElementById('apiKeyInput');
        const key = input.value.trim();
        if (key) {
          configuredKeys.push({ service: selectedService, key: key.substring(0, 8) + '...' });
          input.value = '';
          document.querySelector('#main-content').innerHTML = APIKeys();
          alert('API key added successfully!');
        }
      };
      
      window.removeApiKey = (index) => {
        configuredKeys.splice(index, 1);
        document.querySelector('#main-content').innerHTML = APIKeys();
      };
    </script>
  `;
};
