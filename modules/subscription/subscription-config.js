/**
 * Subscription Configuration
 * Defines tiers, limits, features, and models for each subscription tier
 */

/**
 * Subscription Tiers Configuration
 * Only 3 tiers: Free, Professional, Premium
 * All tiers use Backend for AI calls
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
  PREMIUM: 'premium'
};

/**
 * Subscription Limits per Tier
 */
export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    // Token limits
    tokensPerDay: 50000,
    tokensPerMonth: 1500000,
    maxTokensPerRequest: 2000,
    
    // Request limits
    requestsPerDay: 10,
    requestsPerMonth: 300,
    
    // Time limits (in minutes)
    recordingTimePerDay: 0, // No recording for free
    translationTimePerDay: 0, // No translation for free
    
    // Rate limiting
    rateLimit: {
      requestsPerMinute: 2,
      requestsPerHour: 10
    },
    
    // Allowed models (all models - temporarily open for Free tier)
    allowedModels: ['*'] // All models allowed
  },
  
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
    // Token limits
    tokensPerDay: 500000,
    tokensPerMonth: 15000000,
    maxTokensPerRequest: 4000,
    
    // Request limits
    requestsPerDay: 500,
    requestsPerMonth: 15000,
    
    // Time limits (in minutes)
    recordingTimePerDay: 60, // 1 hour per day
    translationTimePerDay: 120, // 2 hours per day
    
    // Rate limiting
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100
    },
    
    // Allowed models (advanced models)
    allowedModels: [
      'openai/gpt-3.5-turbo',
      'openai/gpt-4',
      'openai/gpt-4o',
      'anthropic/claude-3-5-sonnet-20241022',
      'googleai/gemini-1.5-pro',
      'googleai/gemini-1.5-flash',
      'cerebras/llama-4-scout-17b-16e-instruct'
    ]
  },
  
  [SUBSCRIPTION_TIERS.PREMIUM]: {
    // Token limits
    tokensPerDay: 2000000,
    tokensPerMonth: 60000000,
    maxTokensPerRequest: 8000,
    
    // Request limits
    requestsPerDay: 2000,
    requestsPerMonth: 60000,
    
    // Time limits (in minutes)
    recordingTimePerDay: 240, // 4 hours per day
    translationTimePerDay: 480, // 8 hours per day
    
    // Rate limiting
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 500
    },
    
    // Allowed models (all models)
    allowedModels: ['*'] // All models allowed
  }
};

/**
 * Feature Flags per Tier
 */
export const TIER_FEATURES = {
  [SUBSCRIPTION_TIERS.FREE]: {
    aiChat: true,
    basicTranslation: true,
    screenshot: false,
    recording: false,
    advancedModels: false,
    gmailIntegration: false,
    meetTranslation: false,
    teamsTranslation: false,
    pdfChat: false,
    contextMenu: true,
    webSummary: true
  },
  
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
    aiChat: true,
    basicTranslation: true,
    screenshot: true,
    recording: false, // Not available in Professional
    advancedModels: true,
    gmailIntegration: true,
    meetTranslation: true,
    teamsTranslation: false, // Not available in Professional
    pdfChat: true,
    contextMenu: true,
    webSummary: true
  },
  
  [SUBSCRIPTION_TIERS.PREMIUM]: {
    // All features enabled
    aiChat: true,
    basicTranslation: true,
    screenshot: true,
    recording: true,
    advancedModels: true,
    gmailIntegration: true,
    meetTranslation: true,
    teamsTranslation: true,
    pdfChat: true,
    contextMenu: true,
    webSummary: true
  }
};

/**
 * Subscription Pricing
 */
export const TIER_PRICING = {
  [SUBSCRIPTION_TIERS.FREE]: {
    price: 0,
    currency: 'USD',
    period: 'month',
    trialDays: 0
  },
  
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
    price: 9.99,
    currency: 'USD',
    period: 'month',
    trialDays: 7
  },
  
  [SUBSCRIPTION_TIERS.PREMIUM]: {
    price: 29.99,
    currency: 'USD',
    period: 'month',
    trialDays: 7
  }
};

/**
 * Get limits for a tier
 * @param {string} tier - Tier name
 * @returns {Object} Limits object
 */
export function getLimitsForTier(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS[SUBSCRIPTION_TIERS.FREE];
}

/**
 * Get features for a tier
 * @param {string} tier - Tier name
 * @returns {Object} Features object
 */
export function getFeaturesForTier(tier) {
  return TIER_FEATURES[tier] || TIER_FEATURES[SUBSCRIPTION_TIERS.FREE];
}

/**
 * Get pricing for a tier
 * @param {string} tier - Tier name
 * @returns {Object} Pricing object
 */
export function getPricingForTier(tier) {
  return TIER_PRICING[tier] || TIER_PRICING[SUBSCRIPTION_TIERS.FREE];
}

/**
 * Check if a model is allowed for a tier
 * @param {string} tier - Tier name
 * @param {string} modelId - Full model ID (e.g., 'openai/gpt-4')
 * @returns {boolean}
 */
export function isModelAllowedForTier(tier, modelId) {
  const limits = getLimitsForTier(tier);
  
  // Premium tier with wildcard - all models allowed
  if (limits.allowedModels.includes('*')) {
    return true;
  }
  
  // Check if model is in allowed list
  return limits.allowedModels.includes(modelId);
}

/**
 * Check if a feature is enabled for a tier
 * @param {string} tier - Tier name
 * @param {string} featureName - Feature name
 * @returns {boolean}
 */
export function isFeatureEnabledForTier(tier, featureName) {
  const features = getFeaturesForTier(tier);
  return features[featureName] === true;
}

/**
 * Get required tier for a feature
 * @param {string} featureName - Feature name
 * @returns {string} Required tier name
 */
export function getRequiredTierForFeature(featureName) {
  // Check each tier from lowest to highest
  if (isFeatureEnabledForTier(SUBSCRIPTION_TIERS.FREE, featureName)) {
    return SUBSCRIPTION_TIERS.FREE;
  }
  if (isFeatureEnabledForTier(SUBSCRIPTION_TIERS.PROFESSIONAL, featureName)) {
    return SUBSCRIPTION_TIERS.PROFESSIONAL;
  }
  if (isFeatureEnabledForTier(SUBSCRIPTION_TIERS.PREMIUM, featureName)) {
    return SUBSCRIPTION_TIERS.PREMIUM;
  }
  return SUBSCRIPTION_TIERS.PREMIUM; // Default to highest tier
}

/**
 * Get required tier for a model
 * @param {string} modelId - Full model ID
 * @returns {string} Required tier name
 */
export function getRequiredTierForModel(modelId) {
  // Check each tier from lowest to highest
  if (isModelAllowedForTier(SUBSCRIPTION_TIERS.FREE, modelId)) {
    return SUBSCRIPTION_TIERS.FREE;
  }
  if (isModelAllowedForTier(SUBSCRIPTION_TIERS.PROFESSIONAL, modelId)) {
    return SUBSCRIPTION_TIERS.PROFESSIONAL;
  }
  if (isModelAllowedForTier(SUBSCRIPTION_TIERS.PREMIUM, modelId)) {
    return SUBSCRIPTION_TIERS.PREMIUM;
  }
  return SUBSCRIPTION_TIERS.PREMIUM; // Default to highest tier
}

/**
 * Default subscription configuration
 */
export const DEFAULT_SUBSCRIPTION_CONFIG = {
  tier: SUBSCRIPTION_TIERS.FREE,
  status: 'active',
  expiresAt: null,
  trialEndsAt: null,
  lastSynced: null
};

