/**
 * Admin Models API
 * POST /api/admin/models - Add new model
 * PUT /api/admin/models/:id - Update model
 * DELETE /api/admin/models/:id - Delete/disable model
 * GET /api/admin/models - List all models (including disabled)
 */

import { query } from '../../src/lib/db.js';
import { verifyAuth } from '../../src/middleware/auth.js';

// TODO: Add admin role check
// For now, any authenticated user can manage models
// You should add admin role check later

export default async function handler(req, res) {
  // Require authentication
  await verifyAuth(req, res, async () => {
    try {
      const method = req.method;
      // Get model ID from query params or URL path
      const id = req.query.id || req.query.modelId || (req.url && req.url.split('/').pop());

      switch (method) {
        case 'GET':
          return await handleGetModels(req, res);
        case 'POST':
          return await handleCreateModel(req, res);
        case 'PUT':
          return await handleUpdateModel(req, res, id);
        case 'DELETE':
          return await handleDeleteModel(req, res, id);
        default:
          return res.status(405).json({
            success: false,
            error: 'method_not_allowed',
            message: `Method ${method} not allowed`
          });
      }
    } catch (error) {
      console.error('[Admin Models API] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error.message
      });
    }
  });
}

/**
 * GET /api/admin/models
 * List all models (including disabled)
 */
async function handleGetModels(req, res) {
  try {
    const sql = `
      SELECT 
        id,
        name,
        provider,
        provider_name as "providerName",
        tier,
        priority,
        enabled,
        description,
        max_tokens as "maxTokens",
        supports_streaming as "supportsStreaming",
        category,
        config,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM models
      ORDER BY priority DESC, name ASC
    `;
    
    const result = await query(sql);
    
    return res.status(200).json({
      success: true,
      models: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('[Admin Models] Error getting models:', error);
    throw error;
  }
}

/**
 * POST /api/admin/models
 * Create new model
 */
async function handleCreateModel(req, res) {
  try {
    const {
      id,
      name,
      provider,
      providerName,
      tier = 'free',
      priority = 0,
      enabled = true,
      description,
      maxTokens = 4096,
      supportsStreaming = true,
      category = 'llm',
      config = {}
    } = req.body;

    // Validate required fields
    if (!id || !name || !provider || !providerName) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Missing required fields: id, name, provider, providerName'
      });
    }

    // Validate tier
    if (!['free', 'pro', 'premium'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Invalid tier. Must be: free, pro, or premium'
      });
    }

    // Validate category
    const validCategories = ['llm', 'tts', 'image', 'video', 'coding'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const sql = `
      INSERT INTO models (
        id, name, provider, provider_name, tier, priority, enabled,
        description, max_tokens, supports_streaming, category, config
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id, name, provider, provider_name as "providerName", tier, priority,
        enabled, description, max_tokens as "maxTokens",
        supports_streaming as "supportsStreaming", category, config,
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await query(sql, [
      id,
      name,
      provider,
      providerName,
      tier,
      priority,
      enabled,
      description || null,
      maxTokens,
      supportsStreaming,
      category,
      JSON.stringify(config)
    ]);

    return res.status(201).json({
      success: true,
      model: result.rows[0],
      message: 'Model created successfully'
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'duplicate_model',
        message: `Model with ID "${req.body.id}" already exists`
      });
    }
    throw error;
  }
}

/**
 * PUT /api/admin/models/:id
 * Update existing model
 */
async function handleUpdateModel(req, res, id) {
  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Model ID is required'
      });
    }

    const {
      name,
      provider,
      providerName,
      tier,
      priority,
      enabled,
      description,
      maxTokens,
      supportsStreaming,
      category,
      config
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (provider !== undefined) {
      updates.push(`provider = $${paramIndex++}`);
      values.push(provider);
    }
    if (providerName !== undefined) {
      updates.push(`provider_name = $${paramIndex++}`);
      values.push(providerName);
    }
    if (tier !== undefined) {
      if (!['free', 'pro', 'premium'].includes(tier)) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid tier. Must be: free, pro, or premium'
        });
      }
      updates.push(`tier = $${paramIndex++}`);
      values.push(tier);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(enabled);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (maxTokens !== undefined) {
      updates.push(`max_tokens = $${paramIndex++}`);
      values.push(maxTokens);
    }
    if (supportsStreaming !== undefined) {
      updates.push(`supports_streaming = $${paramIndex++}`);
      values.push(supportsStreaming);
    }
    if (category !== undefined) {
      const validCategories = ['llm', 'tts', 'image', 'video', 'coding'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        });
      }
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(config));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'No fields to update'
      });
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const sql = `
      UPDATE models
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id, name, provider, provider_name as "providerName", tier, priority,
        enabled, description, max_tokens as "maxTokens",
        supports_streaming as "supportsStreaming", category, config,
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'model_not_found',
        message: `Model with ID "${id}" not found`
      });
    }

    return res.status(200).json({
      success: true,
      model: result.rows[0],
      message: 'Model updated successfully'
    });
  } catch (error) {
    throw error;
  }
}

/**
 * DELETE /api/admin/models/:id
 * Delete or disable model
 */
async function handleDeleteModel(req, res, id) {
  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'Model ID is required'
      });
    }

    // Soft delete: just disable the model
    const sql = `
      UPDATE models
      SET enabled = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name
    `;

    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'model_not_found',
        message: `Model with ID "${id}" not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Model "${result.rows[0].name}" disabled successfully`
    });
  } catch (error) {
    throw error;
  }
}

