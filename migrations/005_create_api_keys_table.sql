-- Migration: Create api_keys table
-- Created: 2025-12-01
-- Purpose: Store encrypted API keys for AI providers (backend-managed)

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, google, groq, etc.
    key_name VARCHAR(255), -- Optional: name/description for this key
    encrypted_key TEXT NOT NULL, -- Encrypted API key
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(provider, key_name)
);

-- Indexes for faster lookups
CREATE INDEX idx_api_keys_provider ON api_keys(provider, is_active);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_provider_active ON api_keys(provider, is_active) WHERE is_active = true;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE api_keys IS 'Encrypted API keys for AI providers (backend-managed)';
COMMENT ON COLUMN api_keys.encrypted_key IS 'Encrypted API key (use encryption service to decrypt)';
COMMENT ON COLUMN api_keys.key_name IS 'Optional name/description for key management';

