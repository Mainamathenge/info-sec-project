-- Package Management System Database Initialization Script
-- This script creates all tables based on the TypeScript models

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('USER', 'OWNER', 'ADMIN');

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Packages table
CREATE TABLE IF NOT EXISTS packages (
    package_id VARCHAR(255) PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id VARCHAR(255) NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Download Logs table
CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id VARCHAR(255) NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anonymous downloads
    download_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET -- Using INET type for IP addresses
);

-- Create Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id VARCHAR(255) NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, package_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_packages_owner_id ON packages(owner_id);
CREATE INDEX IF NOT EXISTS idx_packages_created_at ON packages(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_package_version ON comments(package_id, version);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_download_logs_package_id ON download_logs(package_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_package_version ON download_logs(package_id, version);
CREATE INDEX IF NOT EXISTS idx_download_logs_timestamp ON download_logs(download_timestamp);
CREATE INDEX IF NOT EXISTS idx_subscriptions_package_id ON subscriptions(package_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at 
    BEFORE UPDATE ON packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user (password: admin123)
-- Note: In production, change this password and use proper hashing
INSERT INTO users (username, email, password_hash, role) 
VALUES (
    'admin',
    'admin@packagemanagement.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- This is hashed "password"
    'ADMIN'
) ON CONFLICT (username) DO NOTHING;

-- Create sample data for development (optional)
-- You can remove this section for production
INSERT INTO users (username, email, password_hash, role) 
VALUES 
    ('testuser', 'test@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER'),
    ('packageowner', 'owner@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'OWNER')
ON CONFLICT (username) DO NOTHING;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Package Management System database initialized successfully!';
    RAISE NOTICE 'Tables created: users, packages, comments, download_logs, subscriptions';
    RAISE NOTICE 'Default admin user created with username: admin, password: password';
    RAISE NOTICE 'Please change the default admin password in production!';
END $$;
