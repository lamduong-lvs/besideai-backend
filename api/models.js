/**
 * Models API Endpoint
 * GET /api/models - Get available models for user
 */

import { getAvailableModels, getDefaultModel, getRecommendedModels } from '../src/services/models-service.js';
import { optionalAuth } from '../src/middleware/auth.js';
import { User } from '../src/models/index.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only GET method is allowed'
    });
  }

  // Apply optional auth (doesn't require authentication)
  await optionalAuth(req, res, async () => {
    try {
      // Get user tier
      let tier = 'free';
      
      // If user is authenticated, get their subscription tier
      if (req.user) {
        const userWithSubscription = await User.getWithSubscription(req.user.id);
        if (userWithSubscription && userWithSubscription.subscription) {
          tier = userWithSubscription.subscription.tier || 'free';
        }
      }

      // Get tier from query parameter (for testing, override)
      if (req.query.tier && ['free', 'pro', 'premium'].includes(req.query.tier)) {
        tier = req.query.tier;
      }

      // Get available models
      const models = await getAvailableModels(tier);
      const defaultModel = await getDefaultModel(tier);
      const recommendedModels = await getRecommendedModels(tier, 3);

      return res.status(200).json({
        success: true,
        models: models,
        defaultModel: defaultModel?.id || null,
        recommendedModels: recommendedModels.map(m => m.id),
        tier: tier,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Models API] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error.message
      });
    }
  });
}

