// Interactive Communication Space
let messages = [];
let connectedAgents = ['Research', 'Writing', 'Planning', 'Analysis', 'Coding'];

export const InteractiveSpace = () => {
  const [agent, setAgent] = useState('Research');

  return `
    <div class="card">
      <h2>INTERACTIVE COMMUNICATION SPACE</h2>
      
      <!-- Agent Selector -->
      <div style="margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">SELECT AGENT</div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${connectedAgents.map(agentName => `
            <button class="btn" style="padding: 0.75rem 1.5rem; background: #0a0f1a; border: 1px solid #f08c29; color: #f08c29; border-radius: 4px; cursor: pointer;">
              ${agentName}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Chat Area -->
      <div style="background: #0a0f1a; border-radius: 8px; border: 1px solid #333; margin-bottom: 1rem; padding: 1rem; min-height: 300px; max-height: 500px; overflow-y: auto;">
        ${messages.length === 0 ? `
          <div style="text-align: center; color: #888; padding: 2rem;">
            <div>Start a conversation with your agents</div>
            <div style="font-size: 0.9rem; margin-top: 0.5rem;">Agents will help you research, write, plan, and analyze</div>
          </div>
        ` : messages.map((msg, i) => `
          <div style="margin-bottom: 1rem; padding: 1rem; background: ${msg.sender === 'user' ? '#0a0f1a' : '#f08c2911'}; border-left: 3px solid ${msg.sender === 'user' ? '#f08c29' : '#198038'}; border-radius: 4px;">
            <div style="font-family: 'Orbitron', sans-serif; color: ${msg.sender === 'user' ? '#f08c29' : '#198038'}; font-size: 0.8rem; margin-bottom: 0.5rem;">
              ${msg.sender === 'user' ? 'YOU' : msg.sender}
            </div>
            <div style="color: #fff;">${msg.text}</div>
            <div style="color: #888; font-size: 0.7rem; margin-top: 0.5rem; text-align: right;">${msg.time}</div>
          </div>
        `).join('')}
      </div>

      <!-- Input Area -->
      <div style="display: flex; gap: 0.5rem;">
        <input type="text" id="chatInput" placeholder="Type your message..." style="flex: 1; padding: 1rem; background: #0a0f1a; border: 1px solid #555; border-radius: 4px; color: #fff; font-family: 'Courier New', monospace;">
        <button class="btn btn-primary" onclick="sendMessage()" style="padding: 1rem 2rem; background: #f08c29; color: #0a0f1a; font-size: 1.2rem;">
          SEND
        </button>
      </div>

      <script>
        let messages = [];
        
        window.sendMessage = () => {
          const input = document.getElementById('chatInput');
          const text = input.value.trim();
          
          if (text) {
            messages.push({
              sender: 'user',
              text,
              time: new Date().toLocaleTimeString()
            });
            
            // Simulate agent response
            setTimeout(() => {
              messages.push({
                sender: 'Research',
                text: 'I can help you research that. What specific information do you need?',
                time: new Date().toLocaleTimeString()
              });
              document.querySelector('#main-content').innerHTML = InteractiveSpace();
            }, 1000);
            
            input.value = '';
          }
        };
      </script>
    </div>
  `;
};
