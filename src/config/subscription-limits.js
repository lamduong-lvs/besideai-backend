/**
 * Subscription Limits Configuration
 * Defines limits for each subscription tier
 */

export const SUBSCRIPTION_LIMITS = {
  free: {
    maxTokensPerDay: 50000, // Match extension config
    maxRequestsPerDay: 10, // Match extension config
    maxAICallsPerDay: 10, // Match extension config
    maxTokensPerRequest: 2000, // Match extension config
    maxRecordingTimePerDay: 0, // No recording for free
    maxTranslationTimePerDay: 0 // No translation for free
  },
  pro: {
    maxTokensPerDay: 500000, // Match extension config
    maxRequestsPerDay: 500, // Match extension config
    maxAICallsPerDay: 500, // Match extension config
    maxTokensPerRequest: 4000, // Match extension config
    maxRecordingTimePerDay: 60, // 1 hour per day
    maxTranslationTimePerDay: 120 // 2 hours per day
  },
  premium: {
    maxTokensPerDay: 2000000, // Match extension config
    maxRequestsPerDay: 2000, // Match extension config
    maxAICallsPerDay: 2000, // Match extension config
    maxTokensPerRequest: 8000, // Match extension config
    maxRecordingTimePerDay: 240, // 4 hours per day
    maxTranslationTimePerDay: 480 // 8 hours per day
  }
};

