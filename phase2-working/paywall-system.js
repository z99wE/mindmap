/**
 * PAYWALL SYSTEM
 * Monetization: Users pay for INTEGRATION SERVICES, not inference costs
 * Free users: 3 daily runs, NO API keys allowed
 * Premium users: 20x runs, can configure their own API keys, pay for credits
 */

// ============================================
// 1. PAYWALL CONFIGURATION
// ============================================

const PAYWALL_CONFIG = {
  // Free tier limits
  free: {
    dailyRuns: 3,
    monthlyRuns: 30,
    canConfigureAPIKeys: false,
    runsPerDollar: 0, // Free tier doesn't use credits
    maxRunsBeforePrompt: 3, // Prompt at limit
  },
  
  // Premium tier (brings own API keys)
  premium: {
    dailyRuns: 100,
    monthlyRuns: 1000,
    canConfigureAPIKeys: true,
    initialCredits: 500, // 500 runs = 20x free tier
    runsPerDollar: 1, // $1 = 1 run credit
    autoRecharge: false, // Must manually recharge
    maxRunsBeforePrompt: 50, // Prompt when running low
  },
  
  // Enterprise tier
  enterprise: {
    dailyRuns: -1, // Unlimited
    monthlyRuns: -1,
    canConfigureAPIKeys: true,
    initialCredits: -1, // Unlimited
    runsPerDollar: 1,
    autoRecharge: true, // Auto-recharge from payment method
    maxRunsBeforePrompt: -1,
  }
};

// ============================================
// 2. CREDIT SYSTEM
// ============================================

class CreditSystem {
  constructor() {
    this.userCredits = new Map();
    this.userTiers = new Map();
    this.userAPIKeys = new Map();
  }

  // Get user's credit balance
  getBalance(userId) {
    if (!this.userCredits.has(userId)) {
      this.userCredits.set(userId, {
        premium: PAYWALL_CONFIG.premium.initialCredits,
        enterprise: PAYWALL_CONFIG.enterprise.initialCredits
      });
    }
    const tier = this.userTiers.get(userId) || 'free';
    return this.userCredits.get(userId)[tier] || 0;
  }

  // Deduct credits
  deductCredit(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    
    // Free tier doesn't use credits, just daily count
    if (tier === 'free') {
      return true;
    }
    
    // Premium/Enterprise deduct credits
    const balance = this.getBalance(userId);
    if (balance <= 0) {
      return false; // Out of credits
    }
    
    const credits = this.userCredits.get(userId);
    credits[tier]--;
    return true;
  }

  // Add credits
  addCredits(userId, amount) {
    const tier = this.userTiers.get(userId) || 'free';
    if (!this.userCredits.has(userId)) {
      this.userCredits.set(userId, {});
    }
    
    const credits = this.userCredits.get(userId);
    if (credits[tier] === -1) {
      return; // Unlimited
    }
    
    credits[tier] = (credits[tier] || 0) + amount;
  }

  // Get runs per dollar based on tier
  getRunsPerDollar(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    return PAYWALL_CONFIG[tier]?.runsPerDollar || 0;
  }

  // Check if user can afford a run
  canAffordRun(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    
    if (tier === 'free') {
      return true; // Free tier has no cost
    }
    
    return this.getBalance(userId) > 0;
  }

  // Check if user is premium or above
  isPremiumOrHigher(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    return tier === 'premium' || tier === 'enterprise';
  }

  // Get credits needed for next run
  getCostForNextRun(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    return tier === 'free' ? 0 : 1; // 1 credit per run for premium
  }

  // Get credits message
  getCreditMessage(userId) {
    const tier = this.userTiers.get(userId) || 'free';
    const balance = this.getBalance(userId);
    
    if (tier === 'free') {
      return {
        type: 'free',
        message: 'Free tier: 3 runs/day',
        remaining: 3
      };
    }
    
    if (balance <= 0) {
      return {
        type: 'out_of_credits',
        message: 'Out of credits! Purchase more to continue using the service.',
        remaining: 0,
        runsPerDollar: this.getRunsPerDollar(userId)
      };
    }
    
    if (balance <= PAYWALL_CONFIG[tier]?.maxRunsBeforePrompt) {
      return {
        type: 'low_credits',
        message: `Only ${balance} credits remaining. Purchase more to avoid service interruption.`,
        remaining: balance,
        runsPerDollar: this.getRunsPerDollar(userId)
      };
    }
    
    return {
      type: 'good',
      message: `You have ${balance} credits remaining.`,
      remaining: balance,
      runsPerDollar: this.getRunsPerDollar(userId)
    };
  }
}

const creditSystem = new CreditSystem();

// ============================================
// 3. API KEY CONFIGURATION CONTROL
// ============================================

class APIKeyControl {
  constructor() {
    this.userAPIKeys = new Map();
  }

  // Check if user can configure API keys
  canConfigure(userId) {
    return creditSystem.isPremiumOrHigher(userId);
  }

  // Add API key (only for premium/enterprise)
  addAPIKey(userId, service, encryptedKey) {
    if (!this.canConfigure(userId)) {
      return {
        success: false,
        error: 'API key configuration is only available for premium and enterprise users. Upgrade to configure your own API keys.'
      };
    }

    if (!this.userAPIKeys.has(userId)) {
      this.userAPIKeys.set(userId, new Map());
    }
    this.userAPIKeys.get(userId).set(service, encryptedKey);

    return {
      success: true,
      message: `API key added for ${service}. You now have premium access with 20x more runs!`
    };
  }

  // Get API key
  getAPIKey(userId, service) {
    return this.userAPIKeys.get(userId)?.get(service);
  }

  // Check if user has any API key configured
  hasAnyAPIKey(userId) {
    const keys = this.userAPIKeys.get(userId);
    return keys && keys.size > 0;
  }

  // List all configured keys
  listKeys(userId) {
    return this.userAPIKeys.get(userId) ? Array.from(this.userAPIKeys.get(userId).keys()) : [];
  }

  // Remove API key
  removeAPIKey(userId, service) {
    if (!this.canConfigure(userId)) {
      return { success: false, error: 'Only premium users can modify API keys' };
    }
    
    const keys = this.userAPIKeys.get(userId);
    if (keys) {
      keys.delete(service);
      return { success: true, message: `API key for ${service} removed` };
    }
    
    return { success: false, message: 'No API key found' };
  }
}

const apiKeyControl = new APIKeyControl();

// ============================================
// 4. UPGRADE PATHS
// ============================================

const UPGRADE_PATHS = [
  {
    tier: 'free',
    name: 'Free Tier',
    runs: 3/day,
    cost: '$0/month',
    features: [
      'Use our infrastructure (free)',
      'Basic multimodal processing',
      'Memory management'
    ],
    limitations: [
      '3 runs per day',
      'No API key configuration',
      'Standard response quality'
    ],
    upgradePrompt: 'Upgrade for 20x more runs and custom API keys!'
  },
  {
    tier: 'premium',
    name: 'Premium Tier',
    runs: '20x more',
    cost: '$0-5/month + run credits',
    features: [
      '20x more runs initially (500 credits)',
      'Configure your own API keys',
      'Custom LLM models',
      'Priority support'
    ],
    limitations: [
      'Credits deplete with usage',
      'Must purchase more credits to continue',
      'You pay for integration, not inference'
    ],
    upgradePrompt: 'Get 20x more runs and custom API keys!'
  },
  {
    tier: 'enterprise',
    name: 'Enterprise Tier',
    runs: 'Unlimited',
    cost: 'Custom pricing',
    features: [
      'Unlimited runs',
      'All premium features',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
    ],
    limitations: [],
    upgradePrompt: 'Contact us for enterprise pricing'
  }
];

// ============================================
// 5. PAYMENT PROCESSING
// ============================================

class PaymentProcessor {
  constructor() {
    this.paymentMethods = new Map();
    this.subscriptions = new Map();
  }

  // Add payment method
  addPaymentMethod(userId, method) {
    this.paymentMethods.set(userId, method);
    return { success: true, message: 'Payment method added' };
  }

  // Process credit purchase
  purchaseCredits(userId, amountInDollars) {
    const tier = creditSystem.userTiers.get(userId) || 'free';
    
    if (tier === 'free') {
      return { 
        success: false, 
        error: 'Free tier users cannot purchase credits. Upgrade to premium first.' 
      };
    }

    if (tier === 'enterprise') {
      return {
        success: true,
        message: 'Enterprise users have unlimited credits. No purchase needed.',
        creditsAdded: -1
      };
    }

    const runsPerDollar = PAYWALL_CONFIG[tier].runsPerDollar;
    const creditsAdded = amountInDollars * runsPerDollar;

    creditSystem.addCredits(userId, creditsAdded);

    return {
      success: true,
      message: `Successfully added ${creditsAdded} credits for $${amountInDollars}`,
      creditsAdded,
      newBalance: creditSystem.getBalance(userId)
    };
  }

  // Auto-recharge check
  checkAutoRecharge(userId) {
    const tier = creditSystem.userTiers.get(userId) || 'free';
    
    if (tier !== 'enterprise') {
      return { autoRecharge: false };
    }

    const balance = creditSystem.getBalance(userId);
    const threshold = 50; // Recharge when below 50 credits

    if (balance < threshold) {
      // Auto-recharge $20
      const rechargeAmount = 20;
      return this.purchaseCredits(userId, rechargeAmount);
    }

    return { autoRecharge: true, balance };
  }

  // Get upgrade URL
  getUpgradeURL(tier) {
    return `https://your-payment-service.com/upgrade/${tier}`;
  }

  // Get credits page URL
  getCreditsURL(userId) {
    return `https://your-payment-service.com/credits/${userId}`;
  }
}

const paymentProcessor = new PaymentProcessor();

// ============================================
// 6. EXPORTS
// ============================================

module.exports = {
  PAYWALL_CONFIG,
  creditSystem,
  apiKeyControl,
  UPGRADE_PATHS,
  paymentProcessor
};
