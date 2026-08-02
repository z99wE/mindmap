// Interactive Communication Space Component
let messages = [];
let selectedAgent = 'Research';
const connectedAgents = ['Research', 'Writing', 'Planning', 'Analysis', 'Coding'];

export const InteractiveSpace = () => {
  // Global hooks
  window.sendMessage = () => {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    
    if (text) {
      messages.push({
        sender: 'user',
        text,
        time: new Date().toLocaleTimeString()
      });
      
      input.value = '';
      const main = document.getElementById('main-content');
      if (main) {
        main.innerHTML = '';
        main.appendChild(InteractiveSpace());
      }
      
      // Simulate agent response
      setTimeout(() => {
        messages.push({
          sender: selectedAgent,
          text: `Processing request for task: "${text}". Querying vector memory graph and initiating SearXNG reality verification.`,
          time: new Date().toLocaleTimeString()
        });
        if (main) {
          main.innerHTML = '';
          main.appendChild(InteractiveSpace());
        }
      }, 1000);
    }
  };

  window.selectAgent = (agentName) => {
    selectedAgent = agentName;
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = '';
      main.appendChild(InteractiveSpace());
    }
  };

  const container = document.createElement('div');
  container.className = 'card';
  container.innerHTML = `
    <h2>INTERACTIVE COMMUNICATION SPACE</h2>
    
    <!-- Agent Selector -->
    <div style="margin-bottom: 2rem;">
      <div style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">SELECT SPECIALIST AGENT</div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        ${connectedAgents.map(agentName => `
          <button class="btn ${selectedAgent === agentName ? 'btn-primary' : 'btn-secondary'}" 
                  onclick="selectAgent('${agentName}')" 
                  style="padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer;">
            ${agentName}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Chat Area -->
    <div style="background: #0a0f1a; border-radius: 8px; border: 1px solid #555; margin-bottom: 1rem; padding: 1.5rem; min-height: 300px; max-height: 500px; overflow-y: auto;">
      ${messages.length === 0 ? `
        <div style="text-align: center; color: #888; padding: 3rem;">
          <div>Start a conversation with your agents</div>
          <div style="font-size: 0.9rem; margin-top: 0.5rem;">Agents will help you research, write, plan, and analyze</div>
        </div>
      ` : messages.map((msg) => `
        <div style="margin-bottom: 1.5rem; padding: 1.2rem; background: ${msg.sender === 'user' ? '#111625' : 'rgba(25, 128, 56, 0.15)'}; border-left: 3px solid ${msg.sender === 'user' ? '#f08c29' : '#198038'}; border-radius: 4px;">
          <div style="font-family: 'Orbitron', sans-serif; color: ${msg.sender === 'user' ? '#f08c29' : '#198038'}; font-size: 0.85rem; margin-bottom: 0.5rem;">
            ${msg.sender === 'user' ? 'YOU // USER_NODE' : msg.sender.toUpperCase() + ' // AGENT_NODE'}
          </div>
          <div style="color: #fff; font-family: 'Courier New', monospace; line-height: 1.5;">${msg.text}</div>
          <div style="color: #888; font-size: 0.75rem; margin-top: 0.5rem; text-align: right;">${msg.time}</div>
        </div>
      `).join('')}
    </div>

    <!-- Input Area -->
    <div style="display: flex; gap: 0.5rem;">
      <input type="text" id="chatInput" placeholder="What are you thinking? Start with anything..." style="flex: 1; padding: 1rem; background: #0a0f1a; border: 1px solid #555; border-radius: 4px; color: #fff; font-family: 'Courier New', monospace;">
      <button class="btn btn-primary" onclick="sendMessage()" style="padding: 1rem 2rem; font-size: 1.1rem; flex-shrink: 0;">
        SEND
      </button>
    </div>
  `;
  return container;
};
