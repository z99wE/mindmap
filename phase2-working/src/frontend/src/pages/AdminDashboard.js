// Admin Dashboard - Local Only (Not in Cloud Deployments)
// Only visible when deployed locally (not in production/Render/Docker)

export const AdminDashboard = () => {
  const isAdmin = process.env.NODE_ENV === 'development' || process.env.LOCAL_ADMIN === 'true';
  
  if (!isAdmin) {
    return `
      <div class="card">
        <h2>ADMIN ACCESS REQUIRED</h2>
        <p style="color: #f08c29; margin-top: 1rem;">
          This dashboard is only available in local development mode.
          <br>Set <code>NODE_ENV=development</code> to enable.
        </p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h2>ADMIN DASHBOARD</h2>
      
      <!-- Admin Status -->
      <div style="background: rgba(240, 140, 41, 0.15); padding: 1rem; border-radius: 8px; border-left: 3px solid #f08c29; margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">
          ⚙️ ADMIN MODE ACTIVE (LOCAL DEPLOYMENT)
        </div>
        <p style="color: #aaa; margin: 0.5rem 0 0 0; font-size: 0.9rem;">
          Full system control available. All features accessible.
        </p>
      </div>

      <!-- System Status -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">SYSTEM STATUS</h3>
      <div class="stats-grid">
        <div class="stat-box" style="border-color: #f08c29;">
          <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">MEMORY NODES</div>
          <div class="stat-value">1,247</div>
          <div class="stat-label">Total Memory Items</div>
        </div>
        <div class="stat-box" style="border-color: #198038;">
          <div style="font-family: 'Orbitron', sans-serif; color: #198038;">ACTIVE AGENTS</div>
          <div class="stat-value">8</div>
          <div class="stat-label">Running Agents</div>
        </div>
        <div class="stat-box" style="border-color: #0066cc;">
          <div style="font-family: 'Orbitron', sans-serif; color: #0066cc;">LIVE CHANNELS</div>
          <div class="stat-value">6</div>
          <div class="stat-label">Connected</div>
        </div>
        <div class="stat-box" style="border-color: #2070b0;">
          <div style="font-family: 'Orbitron', sans-serif; color: #2070b0;">API KEYS</div>
          <div class="stat-value">24</div>
          <div class="stat-label">Configured</div>
        </div>
      </div>

      <!-- Memory Segregation -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">MEMORY SEGMENTATION</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${['Health', 'Finance', 'Personal', 'Work', 'Relationships', 'Goals', 'Ideas', 'Tasks'].map(cat => `
          <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border-left: 3px solid #f08c29;">
            <div style="font-weight: bold; color: #f08c29;">${cat}</div>
            <div style="color: #198038; font-size: 1.5rem; margin-top: 0.5rem;">${Math.floor(Math.random() * 50 + 10)}</div>
            <div style="color: #888; font-size: 0.8rem;">memories</div>
          </div>
        `).join('')}
      </div>

      <!-- Brain Fragments Visualization -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">BRAIN FRAGMENTS</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #0066cc; font-weight: bold;">FRONTAL LOBE</div>
          <div style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">Planning, Decision Making</div>
          <div style="color: #f08c29; font-size: 1.2rem; margin-top: 0.5rem;">✅ ACTIVE</div>
        </div>
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #0066cc; font-weight: bold;">PARIETAL LOBE</div>
          <div style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">Sensory Processing</div>
          <div style="color: #f08c29; font-size: 1.2rem; margin-top: 0.5rem;">✅ ACTIVE</div>
        </div>
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #0066cc; font-weight: bold;">TEMPORAL LOBE</div>
          <div style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">Memory, Language</div>
          <div style="color: #f08c29; font-size: 1.2rem; margin-top: 0.5rem;">✅ ACTIVE</div>
        </div>
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #0066cc; font-weight: bold;">OCCIPITAL LOBE</div>
          <div style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">Visual Processing</div>
          <div style="color: #f08c29; font-size: 1.2rem; margin-top: 0.5rem;">✅ ACTIVE</div>
        </div>
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #0066cc; font-weight: bold;">COGNITIVE LOAD</div>
          <div style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">Memory Utilization</div>
          <div style="color: #f08c29; font-size: 1.2rem; margin-top: 0.5rem;">32% Loaded</div>
        </div>
        <div style="background: #0a0f1a; padding: 1rem; border-radius: 4px; border: 1px solid #333;">
          <div style="color: #0066cc; font-weight: bold;">NEURAL PATHWAYS</div>
          <div style="color: #aaa; font-size: 0.8rem; margin-top: 0.5rem;">Active Connections</div>
          <div style="color: #f08c29; font-size: 1.2rem; margin-top: 0.5rem;">1,247 Links</div>
        </div>
      </div>

      <!-- User Management -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">USER MANAGEMENT</h3>
      <table class="keys-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Tier</th>
            <th>Daily Usage</th>
            <th>API Keys</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>user_001</td>
            <td style="color: #f08c29;">Free</td>
            <td>3/10</td>
            <td>0</td>
            <td>
              <button class="btn" onclick="alert('Reset user credits')" style="background: #f08c29; color: #0a0f1a; padding: 0.3rem 0.8rem; font-size: 0.8rem;">RESET</button>
            </td>
          </tr>
          <tr>
            <td>user_002</td>
            <td style="color: #198038;">Premium</td>
            <td>45/500</td>
            <td>2</td>
            <td>
              <button class="btn" onclick="alert('Upgrade user')" style="background: #f08c29; color: #0a0f1a; padding: 0.3rem 0.8rem; font-size: 0.8rem;">UPGRADE</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- System Configuration -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #f08c29; margin-bottom: 1rem;">SYSTEM CONFIGURATION</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div>
          <div style="color: #aaa; margin-bottom: 0.5rem;">LLM Provider Priority</div>
          <select style="width: 100%; padding: 0.75rem; background: #0a0f1a; border: 1px solid #555; color: #fff; border-radius: 4px;">
            <option>OmniRoute (Free) → OpenAI → Anthropic</option>
            <option>OpenAI → OmniRoute (Free) → Anthropic</option>
            <option>Anthropic → OmniRoute (Free) → OpenAI</option>
          </select>
        </div>
        <div>
          <div style="color: #aaa; margin-bottom: 0.5rem;">Default TTS Provider</div>
          <select style="width: 100%; padding: 0.75rem; background: #0a0f1a; border: 1px solid #555; color: #fff; border-radius: 4px;">
            <option>Piper (Local, Free)</option>
            <option>Assembly AI (Free Tier)</option>
            <option>Deepgram (Free Credits)</option>
          </select>
        </div>
        <div>
          <div style="color: #aaa; margin-bottom: 0.5rem;">Default STT Provider</div>
          <select style="width: 100%; padding: 0.75rem; background: #0a0f1a; border: 1px solid #555; color: #fff; border-radius: 4px;">
            <option>NVIDIA NIM (Free)</option>
            <option>Assembly AI (Free Tier)</option>
            <option>Deepgram (Free Credits)</option>
          </select>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="alert('Export all data')" style="padding: 1rem 2rem;">EXPORT ALL DATA</button>
        <button class="btn btn-success" onclick="alert('Reset system')" style="padding: 1rem 2rem; background: #198038; color: #fff;">RESET SYSTEM</button>
        <button class="btn btn-accent" onclick="alert('Backup database')" style="padding: 1rem 2rem; background: #f08c29; color: #0a0f1a;">BACKUP DATABASE</button>
      </div>
    </div>
  `;
};
