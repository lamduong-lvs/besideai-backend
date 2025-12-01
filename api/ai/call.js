/**
 * AI Call API Endpoint
 * POST /api/ai/call - Proxy AI requests, backend manages API keys
 */

import { verifyAuth } from '../../src/middleware/auth.js';
import { User } from '../../src/models/index.js';
import { canAccessModel } from '../../src/services/models-service.js';
import { call, stream } from '../../src/lib/ai-providers/index.js';
import { Usage } from '../../src/models/index.js';
import { limitsEnforcer } from '../../src/middleware/limits-enforcer.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'method_not_allowed',
      message: 'Only POST method is allowed'
    });
  }

  // Require authentication
  await verifyAuth(req, res, async () => {
    try {
      const { model, messages, options = {} } = req.body;

      // Validate required fields
      if (!model) {
        return res.status(400).json({
          success: false,
          error: 'missing_model',
          message: 'Model ID is required'
        });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'missing_messages',
          message: 'Messages array is required'
        });
      }

      // Get user with subscription
      const user = await User.getWithSubscription(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'user_not_found',
          message: 'User not found'
        });
      }

      const tier = user.subscription?.tier || 'free';

      // Check if user can access this model
      const canAccess = await canAccessModel(model, tier);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: 'model_not_available',
          message: `Model ${model} is not available for tier ${tier}`
        });
      }

      // Check limits before making request
      try {
        await limitsEnforcer.checkLimit({
          userId: user.id,
          tier: tier,
          feature: 'ai_call',
          model: model
        });
      } catch (limitError) {
        const status = limitError.status || 429;
        return res.status(status).json({
          success: false,
          error: limitError.code || 'limit_exceeded',
          message: limitError.message || 'Usage limit exceeded'
        });
      }

      // Handle streaming
      if (options.stream === true) {
        return handleStreaming(req, res, model, messages, options, user);
      }

      // Make API call
      const startTime = Date.now();
      const result = await call(model, messages, options);
      const duration = Date.now() - startTime;

      // Track usage
      try {
        const today = new Date().toISOString().split('T')[0];
        await Usage.increment(user.id, today, {
          tokens: result.tokens.total,
          requests: 1
        });
      } catch (trackError) {
        console.error('[AI Call] Error tracking usage:', trackError);
        // Don't fail the request if tracking fails
      }

      return res.status(200).json({
        success: true,
        content: result.content,
        model: result.model,
        provider: result.provider,
        tokens: result.tokens,
        finishReason: result.finishReason
      });
    } catch (error) {
      console.error('[AI Call API] Error:', error);
      
      const status = error.status || 500;
      return res.status(status).json({
        success: false,
        error: 'api_error',
        message: error.message || 'AI API call failed'
      });
    }
  });
}

/**
 * Handle streaming response
 */
async function handleStreaming(req, res, model, messages, options, user) {
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const startTime = Date.now();
  let totalTokens = { input: 0, output: 0, total: 0 };

  try {
    const result = await stream(model, messages, options, (chunk) => {
      // Send chunk to client
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    });

    totalTokens = result.tokens;

    // Send completion
    res.write(`data: ${JSON.stringify({ 
      type: 'done', 
      tokens: result.tokens,
      model: result.model,
      provider: result.provider
    })}\n\n`);
    res.end();

    // Track usage
    try {
      const today = new Date().toISOString().split('T')[0];
      await Usage.increment(user.id, today, {
        tokens: result.tokens.total,
        requests: 1
      });
    } catch (trackError) {
      console.error('[AI Call] Error tracking usage:', trackError);
    }
  } catch (error) {
    console.error('[AI Call] Streaming error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`);
    res.end();
  }
}

