/**
 * User Routes (for standalone server)
 * Express router for user endpoints
 */

import express from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { userUpdateValidators, validate } from '../middleware/validation.js';
import { User } from '../models/index.js';

const router = express.Router();

/**
 * GET /api/users/me
 * Get current user with subscription info
 */
router.get('/me', verifyAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const userWithSubscription = await User.getWithSubscription(user.id);

    if (!userWithSubscription) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: userWithSubscription
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me
 * Update current user
 */
router.put('/me', 
  verifyAuth,
  userUpdateValidators,
  validate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const { name, picture, preferences } = req.body;

      const updatedUser = await User.update(user.id, {
        name,
        picture,
        preferences
      });

      res.json({
        success: true,
        user: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

