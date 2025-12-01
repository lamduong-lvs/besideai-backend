/**
 * Subscription Limits Configuration
 * Defines limits for each subscription tier
 */

export const SUBSCRIPTION_LIMITS = {
  free: {
    maxTokensPerDay: 10000,
    maxRequestsPerDay: 50,
    maxAICallsPerDay: 50,
    maxRecordingTimePerDay: 30, // minutes
    maxTranslationTimePerDay: 60 // minutes
  },
  pro: {
    maxTokensPerDay: 100000,
    maxRequestsPerDay: 500,
    maxAICallsPerDay: 500,
    maxRecordingTimePerDay: 300, // minutes
    maxTranslationTimePerDay: 600 // minutes
  },
  premium: {
    maxTokensPerDay: 1000000,
    maxRequestsPerDay: 5000,
    maxAICallsPerDay: 5000,
    maxRecordingTimePerDay: 3000, // minutes
    maxTranslationTimePerDay: 6000 // minutes
  }
};

