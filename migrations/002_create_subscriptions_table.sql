-- Migration: Create subscriptions table
-- Created: 2025-01-01

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    billing_cycle VARCHAR(20), -- 'monthly' or 'yearly'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_tier CHECK (tier IN ('free', 'professional', 'premium', 'byok')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'trial', 'expired', 'cancelled')),
    CONSTRAINT valid_billing_cycle CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly')),
    CONSTRAINT one_active_subscription UNIQUE (user_id) -- One subscription per user
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_trial_ends_at ON subscriptions(trial_ends_at);
CREATE INDEX idx_subscriptions_subscription_ends_at ON subscriptions(subscription_ends_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscriptions IS 'User subscription information';
COMMENT ON COLUMN subscriptions.tier IS 'Subscription tier: free, professional, premium, byok';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, trial, expired, cancelled';
COMMENT ON COLUMN subscriptions.trial_ends_at IS 'When the trial period ends (if applicable)';
COMMENT ON COLUMN subscriptions.subscription_ends_at IS 'When the paid subscription ends';

