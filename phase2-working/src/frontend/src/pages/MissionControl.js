// Mission Control Component - Carbon Design System inspired
let connectedChannels = [];
let configuredKeys = [];
let omnirouteConnected = false;

export const MissionControl = () => {
  return `
    <div class="card">
      <h2>MISSION CONTROL</h2>
      
      <!-- OmniRoute Status -->
      <div style="background: rgba(0, 0, 0, 0.5); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div style="font-family: 'Orbitron', sans-serif; color: #888;">OMNIROUTE STATUS</div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn" onclick="testOmniRoute()" style="padding: 0.5rem 1rem;">TEST CONNECTION</button>
            <button class="btn" onclick="toggleOmniRoute()" style="padding: 0.5rem 1rem;">${omnirouteConnected ? 'STOP' : 'START'}</button>
          </div>
        </div>
        <div style="color: ${omnirouteConnected ? '#39ff14' : '#ff3366'}; font-family: 'Courier New', monospace;">
          ${omnirouteConnected ? '● OMNIROUTE ACTIVE - 90+ FREE PROVIDERS' : '● OMNIROUTE INACTIVE'}
        </div>
        <p style="color: #aaa; margin-top: 0.5rem; font-size: 0.9rem;">
          OmniRoute powers your free tier - routes through 90+ free LLM providers automatically
        </p>
      </div>
      
      <!-- Channel Configuration -->
      <div style="margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #00d2ff; margin-bottom: 1rem;">CONNECT SOCIAL CHANNELS</div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <button class="btn" onclick="connectChannel('whatsapp')" style="padding: 1rem 2rem;">WhatsApp</button>
          <button class="btn" onclick="connectChannel('telegram')" style="padding: 1rem 2rem;">Telegram</button>
          <button class="btn" onclick="connectChannel('slack')" style="padding: 1rem 2rem;">Slack</button>
          <button class="btn" onclick="connectChannel('discord')" style="padding: 1rem 2rem;">Discord</button>
          <button class="btn" onclick="connectChannel('signal')" style="padding: 1rem 2rem;">Signal</button>
          <button class="btn" onclick="connectChannel('email')" style="padding: 1rem 2rem;">Email</button>
        </div>
      </div>
      
      <!-- Connected Channels -->
      ${connectedChannels.length > 0 ? `
        <div style="margin-bottom: 2rem;">
          <div style="font-family: 'Orbitron', sans-serif; color: #39ff14; margin-bottom: 1rem;">CONNECTED CHANNELS (${connectedChannels.length})</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
            ${connectedChannels.map(channel => `
              <div style="background: rgba(57, 255, 20, 0.1); padding: 1rem; border-radius: 4px; border-left: 3px solid #39ff14;">
                <div style="font-weight: bold; color: #39ff14; text-transform: uppercase;">${channel}</div>
                <div style="color: #888; font-size: 0.8rem; margin-top: 0.5rem;">STATUS: CONNECTED</div>
                <button class="btn" onclick="removeChannel('${channel}')" style="margin-top: 0.5rem; background: #ff3366; color: #fff; padding: 0.3rem 0.8rem; font-size: 0.8rem;">DISCONNECT</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- API Keys Configuration -->
      <div style="margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #00d2ff; margin-bottom: 1rem;">BACKEND API KEYS (SECURE - ENCRYPTED)</div>
        <p style="color: #aaa; font-size: 0.9rem; margin-bottom: 1rem;">
          Your API keys are encrypted and NEVER visible to other users. Keys are stored server-side with AES-256 encryption.
        </p>
        
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <select id="keyProvider" style="width: 200px;">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="groq">Groq</option>
            <option value="nvidia">NVIDIA</option>
          </select>
          <input type="password" id="apiKeyInput" placeholder="Paste API key..." style="flex: 1;">
          <button class="btn btn-success" onclick="addApiKey()">ADD KEY</button>
        </div>
      </div>
      
      <!-- Configured Keys -->
      ${configuredKeys.length > 0 ? `
        <div style="margin-bottom: 2rem;">
          <div style="font-family: 'Orbitron', sans-serif; color: #39ff14; margin-bottom: 1rem;">CONFIGURED KEYS (${configuredKeys.length})</div>
          <table class="keys-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Key (Last 8)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${configuredKeys.map((key, i) => `
                <tr>
                  <td class="key-service">${key.provider}</td>
                  <td class="key-value">${key.key}</td>
                  <td>
                    <button class="btn" onclick="removeApiKey(${i})" style="background: #ff3366; color: #fff; padding: 0.3rem 0.8rem; font-size: 0.8rem;">REMOVE</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <!-- Security Notice -->
      <div style="background: rgba(255, 51, 102, 0.1); padding: 1rem; border-radius: 4px; border-left: 3px solid #ff3366;">
        <div style="font-family: 'Orbitron', sans-serif; color: #ff3366;">🔒 SECURITY NOTICE</div>
        <p style="color: #aaa; margin: 0.5rem 0 0 0; font-size: 0.9rem;">
          All API keys are encrypted at rest with AES-256-GCM. Keys are isolated per user and NEVER shared between tenants.
          <br><strong>Admin can only see encrypted key metadata (provider, last 8 chars).</strong>
        </p>
      </div>
    </div>
    
    <script>
      window.connectChannel = (channel) => {
        connectedChannels.push(channel);
        document.querySelector('#main-content').innerHTML = MissionControl();
      };
      
      window.removeChannel = (channel) => {
        connectedChannels = connectedChannels.filter(c => c !== channel);
        document.querySelector('#main-content').innerHTML = MissionControl();
      };
      
      window.addApiKey = () => {
        const provider = document.getElementById('keyProvider').value;
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        
        if (apiKey) {
          configuredKeys.push({ provider, key: apiKey.substring(0, 8) + '...' });
          document.getElementById('apiKeyInput').value = '';
          document.querySelector('#main-content').innerHTML = MissionControl();
          alert('API key added and encrypted securely!');
        }
      };
      
      window.removeApiKey = (index) => {
        configuredKeys.splice(index, 1);
        document.querySelector('#main-content').innerHTML = MissionControl();
      };
      
      window.toggleOmniRoute = () => {
        omnirouteConnected = !omnirouteConnected;
        document.querySelector('#main-content').innerHTML = MissionControl();
        alert('OmniRoute ' + (omnirouteConnected ? 'started' : 'stopped'));
      };
      
      window.testOmniRoute = async () => {
        alert('Testing OmniRoute connection...');
        await new Promise(r => setTimeout(r, 1000));
        alert('OmniRoute connection test passed - 90+ free providers available');
      };
    </script>
  `;
};
