-- Migration: Create models table
-- Created: 2025-12-01
-- Purpose: Store AI models configuration managed by backend

CREATE TABLE IF NOT EXISTS models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, google, groq, etc.
    provider_name VARCHAR(255) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro, premium
    priority INTEGER DEFAULT 0, -- Higher = more priority (for sorting)
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    max_tokens INTEGER DEFAULT 4096,
    supports_streaming BOOLEAN DEFAULT true,
    category VARCHAR(50) DEFAULT 'chat', -- chat, code, image, etc.
    config JSONB DEFAULT '{}'::jsonb, -- Additional config (temperature, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX idx_models_tier ON models(tier);
CREATE INDEX idx_models_enabled ON models(enabled);
CREATE INDEX idx_models_priority ON models(priority DESC);
CREATE INDEX idx_models_provider ON models(provider);
CREATE INDEX idx_models_tier_enabled ON models(tier, enabled);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE models IS 'AI models configuration managed by backend';
COMMENT ON COLUMN models.tier IS 'Subscription tier required: free, pro, premium';
COMMENT ON COLUMN models.priority IS 'Display priority (higher = shown first)';
COMMENT ON COLUMN models.config IS 'Model-specific configuration (temperature, etc.)';

-- Insert default models
INSERT INTO models (id, name, provider, provider_name, tier, priority, enabled, description, max_tokens, supports_streaming, category, config) VALUES
-- Free tier models
('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'OpenAI', 'free', 10, true, 'Fast and efficient model', 4096, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 2000}'),
('gemini-1.5-flash', 'Gemini 1.5 Flash', 'google', 'Google AI', 'free', 9, true, 'Fast and capable model', 8192, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 2000}'),

-- Pro tier models
('gpt-4o', 'GPT-4o', 'openai', 'OpenAI', 'pro', 20, true, 'Most capable model', 16384, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 4000}'),
('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'OpenAI', 'pro', 19, true, 'Fast and efficient GPT-4', 16384, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 4000}'),
('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'anthropic', 'Anthropic', 'pro', 18, true, 'Fast and capable Claude model', 8192, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 4000}'),
('claude-3-opus-20240229', 'Claude 3 Opus', 'anthropic', 'Anthropic', 'pro', 17, true, 'Most capable Claude model', 8192, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 4000}'),
('llama-3.3-70b-versatile', 'Llama 3.3 70B', 'groq', 'Groq', 'pro', 16, true, 'Fast and capable Llama model', 8192, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 4000}'),

-- Premium tier models
('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 'OpenAI', 'premium', 30, true, 'Advanced GPT-4 model', 128000, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 8000}'),
('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'anthropic', 'Anthropic', 'premium', 29, true, 'Advanced Claude model', 8192, true, 'chat', '{"temperature": 0.7, "defaultMaxTokens": 8000}')

ON CONFLICT (id) DO NOTHING;

