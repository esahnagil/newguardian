import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role, kullanıcı tipini belirler (admin, operator, viewer)
export const userRoleEnum = ["admin", "operator", "viewer"] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  role: text("role").notNull().default("viewer").$type<(typeof userRoleEnum)[number]>(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  preferences: json("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by"), // Kullanıcıyı oluşturan kullanıcının ID'si
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ip_address: text("ip_address").notNull(),
  type: text("type").notNull(), // router, switch, server, etc.
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const monitors = pgTable("monitors", {
  id: serial("id").primaryKey(),
  device_id: integer("device_id").notNull(),
  type: text("type").notNull(), // icmp, snmp, http, tcp
  config: json("config").notNull(), // configuration for the specific monitor
  enabled: boolean("enabled").notNull().default(true),
  interval: integer("interval").notNull().default(60), // seconds
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const monitorResults = pgTable("monitor_results", {
  id: serial("id").primaryKey(),
  monitor_id: integer("monitor_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").notNull(), // online, warning, down
  response_time: integer("response_time"), // milliseconds
  details: json("details"), // additional details about the check
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  device_id: integer("device_id").notNull(),
  monitor_id: integer("monitor_id").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(), // info, warning, danger
  status: text("status").notNull().default("active"), // active, acknowledged, escalated, resolved
  timestamp: timestamp("timestamp").defaultNow(),
  acknowledged_at: timestamp("acknowledged_at"),
  resolved_at: timestamp("resolved_at"),
});

export const insertUserSchema = createInsertSchema(users);

export const updateUserSchema = createInsertSchema(users).partial();

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['tr', 'en']).default('tr'),
  email_notifications: z.boolean().default(true),
  dashboard_layout: z.record(z.string(), z.any()).optional(),
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  name: true,
  ip_address: true,
  type: true,
});

export const insertMonitorSchema = createInsertSchema(monitors).pick({
  device_id: true,
  type: true,
  config: true,
  enabled: true,
  interval: true,
});

export const insertAlertSchema = createInsertSchema(alerts).pick({
  device_id: true,
  monitor_id: true,
  message: true,
  severity: true,
  status: true,
});

// Protocol-specific configurations
export const icmpConfigSchema = z.object({
  timeout: z.number().min(1).default(5), // seconds
  packet_size: z.number().min(1).default(56), // bytes
  count: z.number().min(1).default(3), // number of packets to send
});

export const snmpConfigSchema = z.object({
  community: z.string().default("public"),
  version: z.enum(["1", "2c", "3"]).default("2c"),
  port: z.number().default(161),
  oids: z.array(z.string()),
});

export const httpConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  expected_status: z.number().min(100).max(599).default(200),
  timeout: z.number().min(1).default(5), // seconds
  validate_ssl: z.boolean().default(true),
});

export const tcpConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  timeout: z.number().min(1).default(5), // seconds
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertMonitor = z.infer<typeof insertMonitorSchema>;
export type Monitor = typeof monitors.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type MonitorResult = typeof monitorResults.$inferSelect;

export type ICMPConfig = z.infer<typeof icmpConfigSchema>;
export type SNMPConfig = z.infer<typeof snmpConfigSchema>;
export type HTTPConfig = z.infer<typeof httpConfigSchema>;
export type TCPConfig = z.infer<typeof tcpConfigSchema>;
