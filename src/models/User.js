/**
 * User Model
 * Database operations for users table
 */

import { query, getClient } from '../lib/db.js';

export class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.name - User name
   * @param {string} userData.picture - User picture URL
   * @param {string} userData.googleId - Google user ID
   * @param {Object} userData.preferences - User preferences
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    const { email, name, picture, googleId, preferences = {} } = userData;

    const result = await query(
      `INSERT INTO users (email, name, picture, google_id, preferences)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, name || null, picture || null, googleId || null, JSON.stringify(preferences)]
    );

    return this._formatUser(result.rows[0]);
  }

  /**
   * Find user by ID
   * @param {string} id - User UUID
   * @returns {Promise<Object|null>} User or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this._formatUser(result.rows[0]) : null;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null
   */
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0 ? this._formatUser(result.rows[0]) : null;
  }

  /**
   * Find user by Google ID
   * @param {string} googleId - Google user ID
   * @returns {Promise<Object|null>} User or null
   */
  static async findByGoogleId(googleId) {
    const result = await query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );

    return result.rows.length > 0 ? this._formatUser(result.rows[0]) : null;
  }

  /**
   * Find or create user by Google ID
   * @param {Object} userData - User data from Google
   * @returns {Promise<Object>} User
   */
  static async findOrCreateByGoogleId(userData) {
    const { googleId, email, name, picture } = userData;

    // Try to find existing user
    let user = await this.findByGoogleId(googleId);

    if (user) {
      // Update user info if changed
      if (user.email !== email || user.name !== name || user.picture !== picture) {
        user = await this.update(user.id, { email, name, picture });
      }
      return user;
    }

    // Try to find by email (in case Google ID changed)
    user = await this.findByEmail(email);
    if (user) {
      // Update Google ID
      user = await this.update(user.id, { googleId });
      return user;
    }

    // Create new user
    return await this.create({ email, name, picture, googleId });
  }

  /**
   * Update user
   * @param {string} id - User UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.picture !== undefined) {
      fields.push(`picture = $${paramIndex++}`);
      values.push(updates.picture);
    }
    if (updates.googleId !== undefined) {
      fields.push(`google_id = $${paramIndex++}`);
      values.push(updates.googleId);
    }
    if (updates.preferences !== undefined) {
      fields.push(`preferences = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updates.preferences));
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE users 
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return this._formatUser(result.rows[0]);
  }

  /**
   * Delete user
   * @param {string} id - User UUID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * Get user with subscription
   * @param {string} id - User UUID
   * @returns {Promise<Object>} User with subscription
   */
  static async getWithSubscription(id) {
    const result = await query(
      `SELECT 
        u.*,
        s.id as subscription_id,
        s.tier,
        s.status as subscription_status,
        s.trial_ends_at,
        s.subscription_ends_at,
        s.stripe_subscription_id,
        s.stripe_customer_id,
        s.billing_cycle
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const user = this._formatUser(row);

    if (row.subscription_id) {
      user.subscription = {
        id: row.subscription_id,
        tier: row.tier,
        status: row.subscription_status,
        trialEndsAt: row.trial_ends_at,
        subscriptionEndsAt: row.subscription_ends_at,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripeCustomerId: row.stripe_customer_id,
        billingCycle: row.billing_cycle
      };
    }

    return user;
  }

  /**
   * Get user's preferred model
   * @param {string} id - User UUID
   * @returns {Promise<string|null>} Preferred model ID or null
   */
  static async getPreferredModel(id) {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }
    return user.preferences?.preferredModel || null;
  }

  /**
   * Set user's preferred model
   * @param {string} id - User UUID
   * @param {string} modelId - Model ID
   * @returns {Promise<Object>} Updated user
   */
  static async setPreferredModel(id, modelId) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const preferences = user.preferences || {};
    preferences.preferredModel = modelId;

    return await this.update(id, { preferences });
  }

  /**
   * Format user from database row
   * @private
   */
  static _formatUser(row) {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      googleId: row.google_id,
      preferences: typeof row.preferences === 'string' 
        ? JSON.parse(row.preferences) 
        : (row.preferences || {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

