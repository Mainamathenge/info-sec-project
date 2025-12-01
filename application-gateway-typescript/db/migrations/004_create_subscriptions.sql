-- Create subscriptions table for package update notifications
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id VARCHAR(255) NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, package_id)
);

-- Create index for faster lookups by package
CREATE INDEX idx_subscriptions_package_id ON subscriptions(package_id);
