/**
 * Validation Middleware
 * Request validation using express-validator
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation result handler
 * Must be called after validation rules
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'Validation failed',
      details: errors.array()
    });
  }

  next();
}

/**
 * Common validation rules
 */
export const commonValidators = {
  // UUID validation
  uuid: param('id').isUUID().withMessage('Invalid UUID format'),
  
  // Email validation
  email: body('email').isEmail().withMessage('Invalid email format'),
  
  // Tier validation
  tier: body('tier')
    .isIn(['free', 'professional', 'premium', 'byok'])
    .withMessage('Invalid tier. Must be: free, professional, premium, or byok'),
  
  // Status validation
  subscriptionStatus: body('status')
    .optional()
    .isIn(['active', 'trial', 'expired', 'cancelled'])
    .withMessage('Invalid status. Must be: active, trial, expired, or cancelled'),
  
  // Date validation
  date: body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'),
  
  // Positive integer validation
  positiveInt: (field) => body(field)
    .optional()
    .isInt({ min: 0 })
    .withMessage(`${field} must be a positive integer`),
  
  // Billing cycle validation
  billingCycle: body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Invalid billing cycle. Must be: monthly or yearly')
};

/**
 * Usage validation rules
 */
export const usageValidators = [
  body('tokens')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Tokens must be a non-negative integer'),
  body('requests')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Requests must be a non-negative integer'),
  body('recordingTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Recording time must be a non-negative integer (minutes)'),
  body('translationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Translation time must be a non-negative integer (minutes)'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)')
];

/**
 * Subscription validation rules
 */
export const subscriptionValidators = [
  commonValidators.tier,
  commonValidators.subscriptionStatus,
  body('trialEndsAt')
    .optional()
    .isISO8601()
    .withMessage('Trial end date must be in ISO 8601 format'),
  body('subscriptionEndsAt')
    .optional()
    .isISO8601()
    .withMessage('Subscription end date must be in ISO 8601 format'),
  commonValidators.billingCycle
];

/**
 * User update validation rules
 */
export const userUpdateValidators = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('picture')
    .optional()
    .isURL()
    .withMessage('Picture must be a valid URL'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

