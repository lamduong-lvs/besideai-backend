/**
 * Model Preference API Endpoint
 * GET /api/models/preference - Get user's preferred model
 * POST /api/models/preference - Save user's preferred model
 */

import { verifyAuth } from '../../src/middleware/auth.js';
import { User } from '../../src/models/index.js';
import { getModelById } from '../../src/services/models-service.js';

export default async function handler(req, res) {
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

