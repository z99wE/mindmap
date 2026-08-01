// Dashboard Component
let currentTier = 'free';

export const Dashboard = () => {
  const tiers = {
    free: { daily: 3, monthly: 30, limit: 10, runsPerDollar: 0, price: 'FREE' },
    premium: { daily: 15, monthly: 450, limit: 500, runsPerDollar: 50, price: '$1.00' },
    enterprise: { daily: 100, monthly: 3000, limit: 'unlimited', runsPerDollar: 100, price: 'CUSTOM' }
  };

  const usage = tiers[currentTier];
  
  return `
    <div class="card">
      <h2>SYSTEM DASHBOARD</h2>
      
      <!-- Tier Selector -->
      <div style="margin-bottom: 2rem;">
        <div style="color: #888; font-family: 'Orbitron', sans-serif; margin-bottom: 1rem;">SELECT TIER</div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div class="tier-card free ${currentTier === 'free' ? 'selected' : ''}" onclick="setTier('free')">
            <div style="font-family: 'Orbitron', sans-serif; color: #00d2ff; font-size: 1.5rem;">FREE</div>
            <div style="color: #39ff14; font-size: 2rem; font-weight: bold;">${usage.price}</div>
            <div style="color: #888;">10 runs/day trial</div>
            <button class="btn" style="margin-top: 1rem; background: rgba(0, 210, 255, 0.2); border-color: #00d2ff; color: #00d2ff;">CURRENT</button>
          </div>
          <div class="tier-card premium ${currentTier === 'premium' ? 'selected' : ''}" onclick="setTier('premium')">
            <div style="font-family: 'Orbitron', sans-serif; color: #ff3366; font-size: 1.5rem;">PREMIUM</div>
            <div style="color: #fff; font-size: 2rem; font-weight: bold;">${usage.price}</div>
            <div style="color: #888;">500 runs/day + API keys</div>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="showPage('credits')">UPGRADE</button>
          </div>
          <div class="tier-card enterprise ${currentTier === 'enterprise' ? 'selected' : ''}" style="opacity: 0.5; cursor: not-allowed;">
            <div style="font-family: 'Orbitron', sans-serif; color: #888; font-size: 1.5rem; position: relative;">
              ENTERPRISE
              <span style="position: absolute; top: -15px; right: -15px; background: #39ff14; color: #000; padding: 0.2rem 0.6rem; font-size: 0.7rem; border-radius: 4px;">COMING SOON</span>
            </div>
            <div style="color: #39ff14; font-size: 2rem; font-weight: bold;">${usage.price}</div>
            <div style="color: #888;">Unlimited + Custom</div>
            <button class="btn" style="margin-top: 1rem; background: #555; border-color: #888; color: #888; cursor: not-allowed;" disabled>COMING SOON</button>
          </div>
        </div>
      </div>
      
      <!-- Usage Stats -->
      <div class="stats-grid">
        <div class="stat-box" style="border-color: #00d2ff;">
          <div style="font-family: 'Orbitron', sans-serif; color: #00d2ff;">DAILY USAGE</div>
          <div class="stat-value">${usage.daily} <span style="font-size: 1.5rem; color: #888;">/${usage.limit === 'unlimited' ? '∞' : usage.limit}</span></div>
          <div class="stat-label">Runs Today</div>
        </div>
        <div class="stat-box" style="border-color: #ff3366;">
          <div style="font-family: 'Orbitron', sans-serif; color: #ff3366;">MONTHLY USAGE</div>
          <div class="stat-value">${usage.monthly} <span style="font-size: 1.5rem; color: #888;">/${usage.limit === 'unlimited' ? '∞' : usage.limit}</span></div>
          <div class="stat-label">Runs This Month</div>
        </div>
        <div class="stat-box" style="border-color: #39ff14;">
          <div style="font-family: 'Orbitron', sans-serif; color: #39ff14;">CREDITS</div>
          <div class="stat-value">${currentTier === 'free' ? 'N/A' : usage.daily * 10} <span style="font-size: 1.5rem; color: #888;">${currentTier === 'free' ? '' : 'credits'}</span></div>
          <div class="stat-label">Credit Balance</div>
        </div>
      </div>
      
      <!-- Features Table -->
      <h3 style="font-family: 'Orbitron', sans-serif; color: #fff; margin-bottom: 1rem;">FEATURE AVAILABILITY</h3>
      <table class="keys-table">
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free Tier</th>
            <th>Premium Tier</th>
            <th>Enterprise Tier</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color: #fff;">API Key Configuration</td>
            <td style="color: #ff3366;">❌ Not Available</td>
            <td style="color: #39ff14;">✅ Available</td>
            <td style="color: #39ff14;">✅ Available (Coming Soon)</td>
          </tr>
          <tr>
            <td style="color: #fff;">Voice Output</td>
            <td style="color: #ff3366;">❌ Disabled</td>
            <td style="color: #39ff14;">✅ Enabled</td>
            <td style="color: #39ff14;">✅ Enabled (Coming Soon)</td>
          </tr>
          <tr>
            <td style="color: #fff;">Memory Storage</td>
            <td style="color: #888;">1 GB</td>
            <td style="color: #888;">10 GB</td>
            <td style="color: #39ff14;">Unlimited (Coming Soon)</td>
          </tr>
          <tr>
            <td style="color: #fff;">Priority Support</td>
            <td style="color: #ff3366;">❌ No</td>
            <td style="color: #39ff14;">✅ Yes</td>
            <td style="color: #39ff14;">✅ Yes (Coming Soon)</td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-top: 2rem; text-align: center;">
        <button class="btn btn-primary" onclick="showPage('credits')" style="padding: 1rem 2rem; font-size: 1.2rem;">
          PURCHASE CREDITS
        </button>
      </div>
    </div>
    
    <script>
      window.setTier = (tier) => {
        currentTier = tier;
        document.querySelectorAll('.tier-card').forEach(card => card.classList.remove('selected'));
        document.querySelector('.tier-card.' + tier).classList.add('selected');
        document.querySelector('#main-content').innerHTML = Dashboard();
      };
    </script>
  `;
};
