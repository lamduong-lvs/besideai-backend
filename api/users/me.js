/**
 * User Endpoints
 * GET /api/users/me - Get current user
 * PUT /api/users/me - Update current user
 */

import { User } from '../../src/models/index.js';
import { verifyAuth } from '../../src/middleware/auth.js';
import { userUpdateValidators, validate } from '../../src/middleware/validation.js';

/**
 * GET /api/users/me
 * Get current user with subscription info
 */
export async function getCurrentUser(req, res) {
  try {
    // User is already attached by verifyAuth middleware
    const user = req.user;

    // Get user with subscription
    const userWithSubscription = await User.getWithSubscription(user.id);

    if (!userWithSubscription) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      user: userWithSubscription
    });
  } catch (error) {
    console.error('[Users API] Error getting user:', error);
    throw error;
  }
}

/**
 * PUT /api/users/me
 * Update current user
 */
export async function updateCurrentUser(req, res) {
  try {
    const user = req.user;
    const { name, picture, preferences } = req.body;

    // Update user
    const updatedUser = await User.update(user.id, {
      name,
      picture,
      preferences
    });

    return res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('[Users API] Error updating user:', error);
    throw error;
  }
}

/**
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  // Apply auth middleware
  await verifyAuth(req, res, async () => {
    try {
      if (req.method === 'GET') {
        await getCurrentUser(req, res);
      } else if (req.method === 'PUT') {
        // Apply validation
        await Promise.all(userUpdateValidators.map(validator => validator.run(req)));
        await validate(req, res, async () => {
          await updateCurrentUser(req, res);
        });
      } else {
        return res.status(405).json({
          success: false,
          error: 'method_not_allowed',
          message: `Method ${req.method} not allowed`
        });
      }
    } catch (error) {
      // Error will be handled by error handler middleware
      throw error;
    }
  });
}

