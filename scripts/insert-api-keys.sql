-- Insert API Keys (Encrypted)
-- Run this on Supabase SQL Editor
-- Keys are already encrypted with ENCRYPTION_KEY
-- 
-- IMPORTANT: Replace the encrypted_key values below with your own encrypted keys
-- Use scripts/encrypt-keys.js to encrypt your API keys first

INSERT INTO api_keys (provider, key_name, encrypted_key, is_active) VALUES
  ('google', 'Default Google AI Key', 'REPLACE_WITH_ENCRYPTED_GOOGLE_KEY', true),
  ('cerebras', 'Default Cerebras Key', 'REPLACE_WITH_ENCRYPTED_CEREBRAS_KEY', true),
  ('groq', 'Default Groq Key', 'REPLACE_WITH_ENCRYPTED_GROQ_KEY', true)
ON CONFLICT (provider, key_name) 
DO UPDATE SET 
  encrypted_key = EXCLUDED.encrypted_key,
  updated_at = CURRENT_TIMESTAMP;

-- Verify keys were inserted
SELECT provider, key_name, is_active, created_at FROM api_keys ORDER BY provider;

