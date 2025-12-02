-- Migration: Update subscriptions table for Lemon Squeezy
-- Created: 2025-12-01
-- Purpose: Replace Stripe fields with Lemon Squeezy fields

-- Add new columns for Lemon Squeezy
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS lemon_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS lemon_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS lemon_order_id VARCHAR(255);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_subscription_id ON subscriptions(lemon_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_customer_id ON subscriptions(lemon_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_order_id ON subscriptions(lemon_order_id);

-- Keep Stripe columns for backward compatibility (can be removed later)
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;
-- ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_customer_id;

COMMENT ON COLUMN subscriptions.lemon_subscription_id IS 'Lemon Squeezy subscription ID';
COMMENT ON COLUMN subscriptions.lemon_customer_id IS 'Lemon Squeezy customer ID';
COMMENT ON COLUMN subscriptions.lemon_order_id IS 'Lemon Squeezy order ID';

