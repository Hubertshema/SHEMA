-- CallVault Initial Database Schema (PostgreSQL / Neon)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    account_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, DELETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Ensure phone_number column exists on existing databases
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(50);
    END IF;
END $$;

-- Ensure email is nullable on existing databases
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    END IF;
END $$;

-- Drop unique constraint on email if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND contype = 'u' AND conname = 'users_email_key'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
    END IF;
END $$;

-- Add unique constraint on phone_number if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND contype = 'u' AND conname = 'users_phone_number_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_identifier VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    android_version VARCHAR(50),
    app_version VARCHAR(50),
    device_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, LOST
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_device UNIQUE(user_id, device_identifier)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_identifier ON devices(device_identifier);

-- Recordings Table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    call_type VARCHAR(50) NOT NULL, -- INCOMING, OUTGOING, MISSED
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    file_format VARCHAR(50) NOT NULL DEFAULT 'm4a',
    encrypted_file_size BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64) NOT NULL,
    encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    storage_object_key VARCHAR(512),
    phone_number VARCHAR(50),
    contact_name VARCHAR(255),
    upload_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, UPLOADING, COMPLETED, FAILED, DELETED
    verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED', -- UNVERIFIED, VERIFIED, FAILED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Ensure columns exist on recordings table for existing databases
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recordings' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE recordings ADD COLUMN phone_number VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recordings' AND column_name = 'contact_name'
    ) THEN
        ALTER TABLE recordings ADD COLUMN contact_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recordings' AND column_name = 'encryption_algorithm'
    ) THEN
        ALTER TABLE recordings ADD COLUMN encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recordings' AND column_name = 'storage_object_key'
    ) THEN
        ALTER TABLE recordings ADD COLUMN storage_object_key VARCHAR(512);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_device_id ON recordings(device_id);
CREATE INDEX IF NOT EXISTS idx_recordings_checksum ON recordings(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_recordings_phone ON recordings(phone_number);

-- Upload Sessions Table
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    upload_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED, EXPIRED
    expected_file_size BIGINT NOT NULL,
    expected_checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_recording_id ON upload_sessions(recording_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILURE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
