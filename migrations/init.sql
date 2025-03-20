-- NewGuardian İlk Kurulum SQL Dosyası

-- Kullanıcılar Tablosu
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "full_name" TEXT,
  "email" TEXT,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_login_at" TIMESTAMP WITH TIME ZONE,
  "preferences" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "created_by" INTEGER
);

-- Cihazlar Tablosu
CREATE TABLE IF NOT EXISTS "devices" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Monitörler Tablosu
CREATE TABLE IF NOT EXISTS "monitors" (
  "id" SERIAL PRIMARY KEY,
  "device_id" INTEGER NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "interval" INTEGER NOT NULL DEFAULT 60,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Monitör Sonuçları Tablosu
CREATE TABLE IF NOT EXISTS "monitor_results" (
  "id" SERIAL PRIMARY KEY,
  "monitor_id" INTEGER NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL,
  "response_time" INTEGER,
  "details" JSONB,
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Alarmlar Tablosu
CREATE TABLE IF NOT EXISTS "alerts" (
  "id" SERIAL PRIMARY KEY,
  "device_id" INTEGER NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
  "monitor_id" INTEGER NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "acknowledged_at" TIMESTAMP WITH TIME ZONE,
  "resolved_at" TIMESTAMP WITH TIME ZONE
);

-- Varsayılan Admin Kullanıcı Oluştur
INSERT INTO "users" ("username", "password", "full_name", "email", "role")
VALUES ('admin', '$2b$10$6fHokczxfRhd4mGFnNBDYebzl8BhbxO5nNZ/J8x4ZOmI1JovA54ti', 'System Admin', 'admin@example.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- İndeksler
CREATE INDEX IF NOT EXISTS "devices_type_idx" ON "devices"("type");
CREATE INDEX IF NOT EXISTS "monitors_device_id_idx" ON "monitors"("device_id");
CREATE INDEX IF NOT EXISTS "monitor_results_monitor_id_idx" ON "monitor_results"("monitor_id");
CREATE INDEX IF NOT EXISTS "alerts_device_id_idx" ON "alerts"("device_id");
CREATE INDEX IF NOT EXISTS "alerts_monitor_id_idx" ON "alerts"("monitor_id");
CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts"("status");