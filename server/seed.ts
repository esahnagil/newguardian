import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import { devices, monitors, monitorResults, alerts } from "../shared/schema";
import type { InsertDevice, InsertMonitor, InsertAlert } from "../shared/schema";
import { storage, MemStorage } from "./storage";

/**
 * Check if required tables exist in the database
 */
async function checkTablesExist() {
  try {
    const tablesExist = await db.execute(sql`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name IN ('devices', 'monitors', 'monitor_results', 'alerts');
    `);
    
    // rows dizisini ve count değerini kontrol et
    if (tablesExist && tablesExist.rows && tablesExist.rows.length > 0) {
      return parseInt(tablesExist.rows[0].count) >= 4;
    }
    return false;
  } catch (error) {
    console.error("Error checking tables:", error);
    return false;
  }
}

/**
 * Seed the database with initial data
 */
export async function seedDatabase() {
  // Skip seeding if using MemStorage - it's already initialized with sample data
  if (storage instanceof MemStorage) {
    console.log("Using MemStorage, skipping database seeding");
    return;
  }

  try {
    // Check if tables exist
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      console.log("Required tables do not exist, skipping seed operation");
      return;
    }

    // Check if database is already seeded
    const existingDevices = await db.select().from(schema.devices);
    if (existingDevices.length > 0) {
      console.log("Database already seeded, skipping seed operation");
      return;
    }

    console.log("Seeding database with initial data...");

    // Add sample devices
    const sampleDevices: InsertDevice[] = [
      { name: "Core Router", ip_address: "192.168.1.1", type: "router" },
      { name: "Main Switch", ip_address: "192.168.1.2", type: "switch" },
      { name: "Distribution Switch", ip_address: "192.168.1.3", type: "switch" },
      { name: "Web Server", ip_address: "192.168.1.100", type: "server" },
      { name: "Database Server", ip_address: "192.168.1.101", type: "server" },
      { name: "Mail Server", ip_address: "192.168.1.102", type: "server" },
      { name: "Backup Server", ip_address: "192.168.1.103", type: "server" },
      { name: "AP Office 1", ip_address: "192.168.1.150", type: "access_point" },
      { name: "AP Office 2", ip_address: "192.168.1.151", type: "access_point" },
      { name: "AP Meeting Room", ip_address: "192.168.1.152", type: "access_point" },
      { name: "Firewall", ip_address: "192.168.1.254", type: "firewall" },
      { name: "NAS Storage", ip_address: "192.168.1.200", type: "storage" }
    ];

    // Insert devices and get their IDs
    const deviceIds: number[] = [];

    for (const device of sampleDevices) {
      try {
        const [result] = await db
          .insert(devices)
          .values({
            ...device,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        deviceIds.push(result.id);
      } catch (error) {
        console.error(`Error inserting device ${device.name}:`, error);
      }
    }

    // Add ICMP monitors for all devices
    for (const deviceId of deviceIds) {
      try {
        const monitor: InsertMonitor = {
          device_id: deviceId,
          type: "icmp",
          config: { timeout: 5, packet_size: 56, count: 3 },
          enabled: true,
          interval: 60
        };

        const [result] = await db
          .insert(monitors)
          .values({
            ...monitor,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Add initial result
        await db
          .insert(monitorResults)
          .values({
            monitor_id: result.id,
            status: deviceId === 3 ? "down" : deviceId === 5 ? "warning" : "online",
            response_time: deviceId === 5 ? 120 : deviceId === 3 ? null : Math.floor(Math.random() * 20) + 10,
            details: deviceId === 3 ? { error: "Connection refused" } : 
                    deviceId === 5 ? { warning: "High latency" } : null,
            timestamp: new Date()
          });
      } catch (error) {
        console.error(`Error setting up monitor for device ${deviceId}:`, error);
      }
    }

    // Add HTTP monitors for web and mail servers
    try {
      // Web Server HTTP monitor
      const httpWebMonitor: InsertMonitor = {
        device_id: 4, // Web Server
        type: "http",
        config: { 
          url: "http://192.168.1.100", 
          method: "GET", 
          expected_status: 200, 
          timeout: 5,
          validate_ssl: false
        },
        enabled: true,
        interval: 60
      };

      const [httpWebResult] = await db
        .insert(monitors)
        .values({
          ...httpWebMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      // Mail Server HTTP monitor
      const httpMailMonitor: InsertMonitor = {
        device_id: 6, // Mail Server
        type: "http",
        config: { 
          url: "http://192.168.1.102/webmail", 
          method: "GET", 
          expected_status: 200, 
          timeout: 5,
          validate_ssl: false
        },
        enabled: true,
        interval: 60
      };

      const [httpMailResult] = await db
        .insert(monitors)
        .values({
          ...httpMailMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Add TCP monitors for database and mail servers
      const tcpDBMonitor: InsertMonitor = {
        device_id: 5, // Database Server
        type: "tcp",
        config: { port: 5432, timeout: 5 },
        enabled: true,
        interval: 60
      };

      const [tcpDBResult] = await db
        .insert(monitors)
        .values({
          ...tcpDBMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      // Mail Server SMTP TCP monitor
      const tcpMailMonitor: InsertMonitor = {
        device_id: 6, // Mail Server
        type: "tcp",
        config: { port: 25, timeout: 5 },
        enabled: true,
        interval: 60
      };

      const [tcpMailResult] = await db
        .insert(monitors)
        .values({
          ...tcpMailMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Add some alerts
      const alertData: InsertAlert[] = [
        {
          device_id: 4,
          monitor_id: httpWebResult.id,
          message: "Web Server Offline",
          severity: "danger",
          status: "active"
        },
        {
          device_id: 5,
          monitor_id: tcpDBResult.id,
          message: "High CPU Usage",
          severity: "warning",
          status: "active"
        },
        {
          device_id: 6,
          monitor_id: httpMailResult.id,
          message: "Mail Server HTTP Error",
          severity: "danger",
          status: "active"
        },
        {
          device_id: 6,
          monitor_id: tcpMailResult.id,
          message: "Mail Server SMTP Error",
          severity: "warning",
          status: "active"
        },
        {
          device_id: 8,
          monitor_id: 8, // ICMP monitor for AP
          message: "AP Response Time",
          severity: "warning",
          status: "active"
        }
      ];

      for (const alert of alertData) {
        await db
          .insert(alerts)
          .values({
            ...alert,
            timestamp: new Date()
          });
      }
    } catch (error) {
      console.error("Error setting up HTTP/TCP monitors and alerts:", error);
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error during database seeding:", error);
    console.log("Database operations not available, using in-memory storage");
  }
}