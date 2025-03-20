-- Initialize schema for NewGuardian
-- Dropping existing tables if they exist
DROP TABLE IF EXISTS monitor_results;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS users;

-- Creating users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER
);

-- Creating devices table
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating monitors table
CREATE TABLE monitors (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  config JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating monitor_results table
CREATE TABLE monitor_results (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,
  response_time INTEGER,
  details JSONB
);

-- Creating alerts table
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL,
  monitor_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Adding admin user for initial login
INSERT INTO users (username, password, full_name, email, role)
VALUES ('admin', '$2b$10$EjZg2YSJcgaOx0C.HL3MEO.W3c1hG7ZHhdN75mQnw6VIwJ1kkAwKe', 'System Admin', 'admin@example.com', 'admin');