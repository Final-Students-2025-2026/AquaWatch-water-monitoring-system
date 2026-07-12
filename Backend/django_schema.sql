-- Django tables for AquaWatch
-- Run these in Neon query editor

-- Users table (Django auth + custom fields)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) UNIQUE,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP NOT NULL DEFAULT NOW(),
    phone VARCHAR(20),
    pin VARCHAR(6),
    organization_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Organizations table
CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Devices table
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    device_name VARCHAR(255) NOT NULL,
    device_code VARCHAR(100) NOT NULL UNIQUE,
    device_type VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    reading_timestamp TIMESTAMP DEFAULT NOW(),
    ph_value FLOAT NOT NULL,
    turbidity_value FLOAT NOT NULL,
    tds_value FLOAT NOT NULL,
    temperature_celsius FLOAT NOT NULL,
    ec_value FLOAT NOT NULL,
    is_alert BOOLEAN NOT NULL DEFAULT FALSE,
    alert_reason TEXT
);

-- Thresholds table
CREATE TABLE thresholds (
    threshold_id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id),
    sensor_type VARCHAR(50) NOT NULL,
    min_value FLOAT NOT NULL,
    max_value FLOAT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id, sensor_type)
);

-- Alerts table
CREATE TABLE alerts (
    alert_id SERIAL PRIMARY KEY,
    reading_id INTEGER REFERENCES sensor_readings(id),
    device_id INTEGER REFERENCES devices(id),
    alert_type VARCHAR(100) NOT NULL,
    alert_message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Django auth token table
CREATE TABLE authtoken_token (
    key VARCHAR(40) PRIMARY KEY,
    created TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);
