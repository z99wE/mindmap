// Dashboard Component - Redesigned to strictly follow Carbon design specs without blue or purple gradients
let currentTier = 'free';

export const Dashboard = () => {
  const tiers = {
    free: { daily: 3, monthly: 30, limit: 10, runsPerDollar: 0, price: 'FREE' },
    premium: { daily: 15, monthly: 450, limit: 500, runsPerDollar: 50, price: '$1.00' },
    enterprise: { daily: 100, monthly: 3000, limit: 'unlimited', runsPerDollar: 100, price: 'CUSTOM' }
  };

  const usage = tiers[currentTier];
  
  // Set up global hook
  window.setTier = (tier) => {
    currentTier = tier;
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = '';
      main.appendChild(Dashboard());
    }
  };

  const container = document.createElement('div');
  container.className = 'card';
  container.innerHTML = `
    <h2>SYSTEM DASHBOARD</h2>
    
    <!-- Tier Selector -->
    <div style="margin-bottom: 2rem;">
      <div style="color: #888; font-family: 'Orbitron', sans-serif; margin-bottom: 1rem;">SELECT TIER</div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <!-- Free Tier -->
        <div class="tier-card free ${currentTier === 'free' ? 'selected' : ''}" onclick="setTier('free')" style="border-left: 4px solid #f08c29; background: #111625; padding: 1.5rem; border-radius: 8px; flex: 1; min-width: 250px; cursor: pointer; transition: all 0.3s ease;">
          <div style="font-family: 'Orbitron', sans-serif; color: #f08c29; font-size: 1.5rem;">FREE</div>
          <div style="color: #198038; font-size: 2rem; font-weight: bold; margin: 0.5rem 0;">${usage.price}</div>
          <div style="color: #888;">10 runs/day trial</div>
          <button class="btn btn-accent" style="margin-top: 1rem; width: 100%;">CURRENT</button>
        </div>
        
        <!-- Premium Tier -->
        <div class="tier-card premium ${currentTier === 'premium' ? 'selected' : ''}" onclick="setTier('premium')" style="border-left: 4px solid #198038; background: #111625; padding: 1.5rem; border-radius: 8px; flex: 1; min-width: 250px; cursor: pointer; transition: all 0.3s ease;">
          <div style="font-family: 'Orbitron', sans-serif; color: #198038; font-size: 1.5rem;">PREMIUM</div>
          <div style="color: #fff; font-size: 2rem; font-weight: bold; margin: 0.5rem 0;">${usage.price}</div>
          <div style="color: #888;">500 runs/day + API keys</div>
          <button class="btn btn-primary" style="margin-top: 1rem; width: 100%;" onclick="showPage('credits')">UPGRADE</button>
        </div>
        
        <!-- Enterprise Tier -->
        <div class="tier-card enterprise ${currentTier === 'enterprise' ? 'selected' : ''}" style="border-left: 4px solid #555; background: #111625; padding: 1.5rem; border-radius: 8px; flex: 1; min-width: 250px; opacity: 0.6; cursor: not-allowed; position: relative;">
          <div style="font-family: 'Orbitron', sans-serif; color: #888; font-size: 1.5rem;">
            ENTERPRISE
            <span style="position: absolute; top: 10px; right: 10px; background: #198038; color: #fff; padding: 0.2rem 0.6rem; font-size: 0.7rem; border-radius: 4px;">COMING SOON</span>
          </div>
          <div style="color: #198038; font-size: 2rem; font-weight: bold; margin: 0.5rem 0;">${usage.price}</div>
          <div style="color: #888;">Unlimited + Custom</div>
          <button class="btn" style="margin-top: 1rem; width: 100%; background: #555; border-color: #888; color: #888; cursor: not-allowed;" disabled>COMING SOON</button>
        </div>
      </div>
    </div>
    
    <!-- Usage Stats -->
    <div class="stats-grid">
      <div class="stat-box" style="border-left: 4px solid #f08c29;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">DAILY USAGE</div>
        <div class="stat-value">${usage.daily} <span style="font-size: 1.5rem; color: #888;">/${usage.limit === 'unlimited' ? '∞' : usage.limit}</span></div>
        <div class="stat-label">Runs Today</div>
      </div>
      <div class="stat-box" style="border-left: 4px solid #f08c29;">
        <div style="font-family: 'Orbitron', sans-serif; color: #f08c29;">MONTHLY USAGE</div>
        <div class="stat-value">${usage.monthly} <span style="font-size: 1.5rem; color: #888;">/${usage.limit === 'unlimited' ? '∞' : usage.limit}</span></div>
        <div class="stat-label">Runs This Month</div>
      </div>
      <div class="stat-box" style="border-left: 4px solid #198038;">
        <div style="font-family: 'Orbitron', sans-serif; color: #198038;">CREDITS</div>
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
          <td style="color: #f08c29;">Not Available</td>
          <td style="color: #198038;">Available</td>
          <td style="color: #198038;">Available (Coming Soon)</td>
        </tr>
        <tr>
          <td style="color: #fff;">Voice Output</td>
          <td style="color: #f08c29;">Disabled</td>
          <td style="color: #198038;">Enabled</td>
          <td style="color: #198038;">Enabled (Coming Soon)</td>
        </tr>
        <tr>
          <td style="color: #fff;">Memory Storage</td>
          <td style="color: #888;">1 GB</td>
          <td style="color: #888;">10 GB</td>
          <td style="color: #198038;">Unlimited (Coming Soon)</td>
        </tr>
        <tr>
          <td style="color: #fff;">Priority Support</td>
          <td style="color: #f08c29;">No</td>
          <td style="color: #198038;">Yes</td>
          <td style="color: #198038;">Yes (Coming Soon)</td>
        </tr>
      </tbody>
    </table>
    
    <div style="margin-top: 2rem; text-align: center;">
      <button class="btn btn-primary" onclick="showPage('credits')" style="padding: 1rem 2rem; font-size: 1.2rem;">
        PURCHASE CREDITS
      </button>
    </div>
  `;
  return container;
};
