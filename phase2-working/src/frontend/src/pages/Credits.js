// Credits Component
let creditsBalance = 1000;
let creditsToAdd = 100;
let tier = 'premium';

const prices = {
  free: 0,
  premium: 0.02,  // $0.02 per run
  enterprise: 0.01  // Volume discount
};

export const Credits = () => {
  return `
    <div class="card">
      <h2>CREDIT MANAGEMENT</h2>
      
      <!-- Balance Card -->
      <div style="background: linear-gradient(135deg, rgba(0, 210, 255, 0.2) 0%, rgba(0, 10, 20, 0.8) 100%); 
                  padding: 2rem; border-radius: 8px; text-align: center; 
                  border: 2px solid #00d2ff; box-shadow: 0 0 30px #00d2ff33; margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #888; margin-bottom: 0.5rem;">
          CURRENT BALANCE
        </div>
        <div style="font-size: 4rem; font-weight: bold; color: #fff; 
                    font-family: 'Courier New', monospace; text-shadow: 0 0 20px #00d2ff;">
          ${creditsBalance.toLocaleString()}
        </div>
        <div style="color: #39ff14; font-size: 1.2rem; margin-top: 1rem;">
          RUNS AVAILABLE
        </div>
      </div>
      
      <!-- Tier Selector -->
      <div style="margin-bottom: 2rem;">
        <div style="color: #888; font-family: 'Orbitron', sans-serif; margin-bottom: 1rem;">YOUR TIER</div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <button class="btn ${tier === 'premium' ? 'btn-accent' : ''}" 
                  onclick="setTier('premium')"
                  style="padding: 1rem 2rem; ${tier === 'premium' ? 'background: #ff3366; color: #fff;' : ''}">
            PREMIUM
          </button>
          <button class="btn ${tier === 'enterprise' ? 'btn-success' : ''}" 
                  onclick="setTier('enterprise')"
                  style="padding: 1rem 2rem; ${tier === 'enterprise' ? 'background: #39ff14; color: #000;' : ''}">
            ENTERPRISE
          </button>
        </div>
      </div>
      
      <!-- Purchase Form -->
      <div style="background: rgba(0, 0, 0, 0.5); padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
        <div style="font-family: 'Orbitron', sans-serif; color: #fff; margin-bottom: 1rem;">
          PURCHASE CREDITS
        </div>
        
        <!-- Amount Buttons -->
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
          ${[100, 500, 1000, 5000].map(amount => `
            <button class="btn ${creditsToAdd === amount ? 'btn-primary' : ''}" 
                    onclick="setAmount(${amount})"
                    style="padding: 0.8rem 1.5rem; ${creditsToAdd === amount ? 'background: #00d2ff; color: #000;' : ''}">
              ${amount}
            </button>
          `).join('')}
        </div>
        
        <!-- Cost Calculation -->
        <div style="display: flex; gap: 2rem; align-items: center; margin-bottom: 1rem; font-size: 1.1rem;">
          <span style="color: #888;">Credits to purchase:</span>
          <span style="color: #00d2ff; font-family: 'Courier New', monospace; font-size: 2rem; font-weight: bold;">
            ${creditsToAdd.toLocaleString()}
          </span>
          <span style="color: #888;">at $${(creditsToAdd * prices[tier]).toFixed(2)}</span>
        </div>
        
        <button class="btn btn-primary" onclick="purchaseCredits()" 
                style="width: 100%; padding: 1.5rem; font-size: 1.2rem;">
          PURCHASE CREDITS
        </button>
      </div>
      
      <!-- Pricing Info -->
      <div style="background: rgba(255, 51, 102, 0.1); padding: 1.5rem; border-radius: 8px; border-left: 3px solid #ff3366;">
        <h3 style="font-family: 'Orbitron', sans-serif; color: #ff3366; margin: 0 0 1rem 0;">
          PRICING TIER
        </h3>
        <div style="color: #aaa; line-height: 1.6;">
          <p><strong style="color: #fff;">${tier.toUpperCase()} TIER:</strong> ${prices[tier] === 0 ? 'FREE' : '$' + prices[tier] + ' per run'}</p>
          <p>${tier === 'premium' ? '500 initial credits included' : 'Unlimited runs included'}</p>
          <p>Auto-recharge: ${tier === 'enterprise' ? 'Enabled' : 'Disabled'}</p>
        </div>
      </div>
      
      <div style="margin-top: 2rem; background: rgba(57, 255, 20, 0.1); padding: 1rem; border-radius: 4px; border-left: 3px solid #39ff14;">
        <p style="color: #39ff14; font-family: 'Orbitron', sans-serif;">
          💡 Tip: Bring your own API keys for 500+ daily runs with no additional cost!
        </p>
      </div>
    </div>
    
    <script>
      window.setTier = (newTier) => {
        tier = newTier;
        document.querySelector('#main-content').innerHTML = Credits();
      };
      
      window.setAmount = (amount) => {
        creditsToAdd = amount;
        document.querySelector('#main-content').innerHTML = Credits();
      };
      
      window.purchaseCredits = () => {
        const cost = creditsToAdd * prices[tier];
        if (tier === 'free') {
          alert('Free tier users cannot purchase credits. Upgrade to Premium first.');
          return;
        }
        creditsBalance += creditsToAdd;
        alert('Successfully purchased ' + creditsToAdd + ' credits for $' + cost.toFixed(2) + '! Your new balance is ' + creditsBalance.toLocaleString() + ' credits.');
        document.querySelector('#main-content').innerHTML = Credits();
      };
    </script>
  `;
};
