-- Migration: Add role column to users table
-- Created: 2025-01-XX
-- Purpose: Support admin role management instead of hardcoded email checks

-- Add role column with default 'user'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user' NOT NULL;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add constraint to ensure valid roles
ALTER TABLE users 
ADD CONSTRAINT check_role_valid 
CHECK (role IN ('user', 'admin'));

-- Update existing admin user if exists (optional - can be done manually)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@besideai.work';

COMMENT ON COLUMN users.role IS 'User role: user or admin';

