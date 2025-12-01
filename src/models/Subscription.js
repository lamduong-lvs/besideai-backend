/**
 * Subscription Model
 * Database operations for subscriptions table
 */

import { query, getClient } from '../lib/db.js';

export class Subscription {
  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription data
   * @param {string} subscriptionData.userId - User UUID
   * @param {string} subscriptionData.tier - Tier (free, professional, premium, byok)
   * @param {string} subscriptionData.status - Status (active, trial, expired, cancelled)
   * @param {Date} subscriptionData.trialEndsAt - Trial end date
   * @param {Date} subscriptionData.subscriptionEndsAt - Subscription end date
   * @param {string} subscriptionData.stripeSubscriptionId - Stripe subscription ID
   * @param {string} subscriptionData.stripeCustomerId - Stripe customer ID
   * @param {string} subscriptionData.billingCycle - Billing cycle (monthly, yearly)
   * @returns {Promise<Object>} Created subscription
   */
  static async create(subscriptionData) {
    const {
      userId,
      tier = 'free',
      status = 'active',
      trialEndsAt = null,
      subscriptionEndsAt = null,
      stripeSubscriptionId = null,
      stripeCustomerId = null,
      billingCycle = null
    } = subscriptionData;

    // Check if user already has a subscription
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new Error('User already has a subscription');
    }

    const result = await query(
      `INSERT INTO subscriptions 
       (user_id, tier, status, trial_ends_at, subscription_ends_at, 
        stripe_subscription_id, stripe_customer_id, billing_cycle)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        tier,
        status,
        trialEndsAt,
        subscriptionEndsAt,
        stripeSubscriptionId,
        stripeCustomerId,
        billingCycle
      ]
    );

    return this._formatSubscription(result.rows[0]);
  }

  /**
   * Find subscription by user ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>} Subscription or null
   */
  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [userId]
    );

    return result.rows.length > 0 ? this._formatSubscription(result.rows[0]) : null;
  }

  /**
   * Find subscription by ID
   * @param {string} id - Subscription UUID
   * @returns {Promise<Object|null>} Subscription or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this._formatSubscription(result.rows[0]) : null;
  }

  /**
   * Find subscription by Stripe subscription ID
   * @param {string} stripeSubscriptionId - Stripe subscription ID
   * @returns {Promise<Object|null>} Subscription or null
   */
  static async findByStripeSubscriptionId(stripeSubscriptionId) {
    const result = await query(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );

    return result.rows.length > 0 ? this._formatSubscription(result.rows[0]) : null;
  }

  /**
   * Update subscription
   * @param {string} userId - User UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated subscription
   */
  static async update(userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.tier !== undefined) {
      fields.push(`tier = $${paramIndex++}`);
      values.push(updates.tier);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.trialEndsAt !== undefined) {
      fields.push(`trial_ends_at = $${paramIndex++}`);
      values.push(updates.trialEndsAt);
    }
    if (updates.subscriptionEndsAt !== undefined) {
      fields.push(`subscription_ends_at = $${paramIndex++}`);
      values.push(updates.subscriptionEndsAt);
    }
    if (updates.stripeSubscriptionId !== undefined) {
      fields.push(`stripe_subscription_id = $${paramIndex++}`);
      values.push(updates.stripeSubscriptionId);
    }
    if (updates.stripeCustomerId !== undefined) {
      fields.push(`stripe_customer_id = $${paramIndex++}`);
      values.push(updates.stripeCustomerId);
    }
    if (updates.billingCycle !== undefined) {
      fields.push(`billing_cycle = $${paramIndex++}`);
      values.push(updates.billingCycle);
    }

    if (fields.length === 0) {
      return await this.findByUserId(userId);
    }

    values.push(userId);
    const result = await query(
      `UPDATE subscriptions 
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this._formatSubscription(result.rows[0]);
  }

  /**
   * Upgrade subscription tier
   * @param {string} userId - User UUID
   * @param {string} newTier - New tier
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  static async upgrade(userId, newTier, options = {}) {
    const updates = {
      tier: newTier,
      status: 'active',
      ...options
    };

    return await this.update(userId, updates);
  }

  /**
   * Cancel subscription
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Updated subscription
   */
  static async cancel(userId) {
    return await this.update(userId, {
      status: 'cancelled'
    });
  }

  /**
   * Expire subscription
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Updated subscription
   */
  static async expire(userId) {
    return await this.update(userId, {
      status: 'expired',
      tier: 'free' // Downgrade to free
    });
  }

  /**
   * Start trial
   * @param {string} userId - User UUID
   * @param {string} tier - Trial tier
   * @param {number} trialDays - Number of trial days
   * @returns {Promise<Object>} Updated subscription
   */
  static async startTrial(userId, tier, trialDays = 7) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return await this.update(userId, {
      tier,
      status: 'trial',
      trialEndsAt
    });
  }

  /**
   * Format subscription from database row
   * @private
   */
  static _formatSubscription(row) {
    return {
      id: row.id,
      userId: row.user_id,
      tier: row.tier,
      status: row.status,
      trialEndsAt: row.trial_ends_at,
      subscriptionEndsAt: row.subscription_ends_at,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      billingCycle: row.billing_cycle,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

