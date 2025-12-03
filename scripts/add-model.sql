-- Script to add a new AI model to the database
-- Usage: Run this SQL script in your PostgreSQL database

-- Example: Add GPT-4o model
INSERT INTO models (
    id,
    name,
    provider,
    provider_name,
    tier,
    priority,
    enabled,
    description,
    max_tokens,
    supports_streaming,
    category,
    config
) VALUES (
    'gpt-4o',                    -- Model ID (must be unique)
    'GPT-4o',                     -- Display name
    'openai',                     -- Provider ID (openai, anthropic, google, groq)
    'OpenAI',                     -- Provider display name
    'pro',                        -- Tier: free, pro, or premium
    20,                           -- Priority (higher = shown first, used for default model)
    true,                         -- Enabled
    'Most capable GPT-4 model',   -- Description
    16384,                        -- Max tokens
    true,                         -- Supports streaming
    'llm',                        -- Category: llm, tts, image, video, coding
    '{"temperature": 0.7, "defaultMaxTokens": 4000}'::jsonb  -- Additional config
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    provider = EXCLUDED.provider,
    provider_name = EXCLUDED.provider_name,
    tier = EXCLUDED.tier,
    priority = EXCLUDED.priority,
    enabled = EXCLUDED.enabled,
    description = EXCLUDED.description,
    max_tokens = EXCLUDED.max_tokens,
    supports_streaming = EXCLUDED.supports_streaming,
    category = EXCLUDED.category,
    config = EXCLUDED.config,
    updated_at = CURRENT_TIMESTAMP;

-- Example: Add Claude 3.5 Sonnet
INSERT INTO models (
    id,
    name,
    provider,
    provider_name,
    tier,
    priority,
    enabled,
    description,
    max_tokens,
    supports_streaming,
    category,
    config
) VALUES (
    'claude-3-5-sonnet-20241022',
    'Claude 3.5 Sonnet',
    'anthropic',
    'Anthropic',
    'pro',
    18,
    true,
    'Fast and capable Claude model',
    8192,
    true,
    'llm',
    '{"temperature": 0.7, "defaultMaxTokens": 4000}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    provider = EXCLUDED.provider,
    provider_name = EXCLUDED.provider_name,
    tier = EXCLUDED.tier,
    priority = EXCLUDED.priority,
    enabled = EXCLUDED.enabled,
    description = EXCLUDED.description,
    max_tokens = EXCLUDED.max_tokens,
    supports_streaming = EXCLUDED.supports_streaming,
    category = EXCLUDED.category,
    config = EXCLUDED.config,
    updated_at = CURRENT_TIMESTAMP;

-- Example: Add Gemini model
INSERT INTO models (
    id,
    name,
    provider,
    provider_name,
    tier,
    priority,
    enabled,
    description,
    max_tokens,
    supports_streaming,
    category,
    config
) VALUES (
    'gemini-1.5-pro',
    'Gemini 1.5 Pro',
    'google',
    'Google AI',
    'premium',
    25,
    true,
    'Advanced Gemini model',
    8192,
    true,
    'llm',
    '{"temperature": 0.7, "defaultMaxTokens": 4000}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    provider = EXCLUDED.provider,
    provider_name = EXCLUDED.provider_name,
    tier = EXCLUDED.tier,
    priority = EXCLUDED.priority,
    enabled = EXCLUDED.enabled,
    description = EXCLUDED.description,
    max_tokens = EXCLUDED.max_tokens,
    supports_streaming = EXCLUDED.supports_streaming,
    category = EXCLUDED.category,
    config = EXCLUDED.config,
    updated_at = CURRENT_TIMESTAMP;

