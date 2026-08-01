/**
 * PAYWALL SYSTEM
 * Monetization: Users pay for INTEGRATION SERVICES, not inference costs
 * Free tier: 50 runs/day (generous trial), NO API keys allowed
 * Premium tier: 1000 runs/day, can configure their own API keys, pay for credits
 * Enterprise tier: Unlimited runs, full access
 */

// ============================================
// 1. PAYWALL CONFIGURATION (UPDATED FOR NON-TECH USERS)
// ============================================

const PAYWALL_CONFIG = {
  // Free tier - limited trial
  free: {
    dailyRuns: 10,        // 10 free runs per day
    monthlyRuns: 300,
    canConfigureAPIKeys: false,
    runsPerDollar: 0,     // Free tier doesn't use credits
    maxRunsBeforePrompt: 8,  // Prompt when running low
  },
  
  // Premium tier (brings own API keys) - 500 runs per day
  premium: {
    dailyRuns: 500,
    monthlyRuns: 15000,
    canConfigureAPIKeys: true,
    initialCredits: 500,   // 500 initial credits
    runsPerDollar: 50,     // $1 buys 50 runs (0.02 per run)
    autoRecharge: false,
    maxRunsBeforePrompt: 50,  // 10% buffer
  },
  
  // Enterprise tier
  enterprise: {
    dailyRuns: -1,  // Unlimited
    monthlyRuns: -1,
    canConfigureAPIKeys: true,
    initialCredits: -1,  // Unlimited
    runsPerDollar: 100,
    autoRecharge: true,
    maxRunsBeforePrompt: -1,
  }
};