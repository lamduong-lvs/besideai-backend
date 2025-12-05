/**
 * Models API Endpoint
 * GET /api/models - Get available models for user
 * GET /api/models/preference - Get user's preferred model
 * POST /api/models/preference - Save user's preferred model
 */

import { getAvailableModels, getDefaultModel, getRecommendedModels, getModelById } from '../src/services/models-service.js';
import { optionalAuth, verifyAuth } from '../src/middleware/auth.js';
import { User } from '../src/models/index.js';

/**
 * Handle /api/models/preference endpoint
 */
async function handlePreference(req, res) {
  // Require authentication
  await verifyAuth(req, res, async () => {
    try {
      const user = req.user;

      if (req.method === 'GET') {
        // Get user's preferred model
        const preferredModel = await User.getPreferredModel(user.id);
        
        return res.status(200).json({
          success: true,
          preferredModel: preferredModel || null,
          updatedAt: user.updatedAt || null
        });
      }

      if (req.method === 'POST') {
        // Save user's preferred model
        const { modelId } = req.body;

        if (!modelId) {
          return res.status(400).json({
            success: false,
            error: 'missing_model_id',
            message: 'Model ID is required'
          });
        }

        // Verify model exists and is enabled
        const model = await getModelById(modelId);
        if (!model) {
          return res.status(404).json({
            success: false,
            error: 'model_not_found',
            message: `Model ${modelId} not found or disabled`
          });
        }

        // Save preferred model
        await User.setPreferredModel(user.id, modelId);

        return res.status(200).json({
          success: true,
          preferredModel: modelId,
          message: 'Preferred model saved successfully',
          updatedAt: new Date().toISOString()
        });
      }

      // Method not allowed
      return res.status(405).json({
        success: false,
        error: 'method_not_allowed',
        message: 'Only GET and POST methods are allowed'
      });
    } catch (error) {
      console.error('[Model Preference API] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error.message
      });
    }
  });
}

/**
 * Handle /api/models endpoint
 */
async function handleModels(req, res) {
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

      // Group models by category
      const categories = {};
      models.forEach(model => {
        const category = model.category || 'llm'; // Default to 'llm' if no category
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(model.id);
      });

      return res.status(200).json({
        success: true,
        models: models,
        categories: categories,
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

export default async function handler(req, res) {
  // Parse URL to determine endpoint
  let pathname = req.url || '';
  if (pathname.includes('?')) {
    pathname = pathname.split('?')[0];
  }

  // Check if this is a preference endpoint
  if (pathname.includes('/preference') || pathname.endsWith('/preference')) {
    return handlePreference(req, res);
  }

  // Otherwise handle as models endpoint
  return handleModels(req, res);
}

