-- Migration: Create usage table
-- Created: 2025-01-01

CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tokens INTEGER DEFAULT 0,
    requests INTEGER DEFAULT 0,
    recording_time INTEGER DEFAULT 0, -- in minutes
    translation_time INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One record per user per day
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indexes
CREATE INDEX idx_usage_user_id ON usage(user_id);
CREATE INDEX idx_usage_date ON usage(date);
CREATE INDEX idx_usage_user_date ON usage(user_id, date);
CREATE INDEX idx_usage_created_at ON usage(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE usage IS 'Daily usage tracking for each user';
COMMENT ON COLUMN usage.date IS 'Date of usage (YYYY-MM-DD)';
COMMENT ON COLUMN usage.tokens IS 'Total AI tokens used on this date';
COMMENT ON COLUMN usage.requests IS 'Total API requests made on this date';
COMMENT ON COLUMN usage.recording_time IS 'Total recording time in minutes';
COMMENT ON COLUMN usage.translation_time IS 'Total translation time in minutes';

