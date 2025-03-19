import { db } from "./db";
import { sql } from "drizzle-orm";
import { devices, monitors, monitorResults, alerts } from "@shared/schema";
import type { InsertDevice, InsertMonitor, InsertAlert } from "@shared/schema";
import { storage, MemStorage } from "./storage";

/**
 * Check if required tables exist in the database
 */
async function checkTablesExist() {
  try {
    const tablesExist = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name IN ('devices', 'monitors', 'monitor_results', 'alerts')
      );
    `);
    return tablesExist.rows[0].exists;
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
    const existingDevices = await db.select().from(devices);
    if (existingDevices.length > 0) {
      console.log("Database already seeded, skipping seed operation");
      return;
    }

    console.log("Seeding database with initial data...");

    // Add sample devices
    const sampleDevices: InsertDevice[] = [
      { name: "Core Router", ipAddress: "192.168.1.1", type: "router" },
      { name: "Main Switch", ipAddress: "192.168.1.2", type: "switch" },
      { name: "Web Server", ipAddress: "192.168.1.100", type: "server" },
      { name: "Database Server", ipAddress: "192.168.1.101", type: "server" },
      { name: "AP Office 1", ipAddress: "192.168.1.150", type: "access_point" }
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
          deviceId,
          type: "icmp",
          config: { timeout: 5, packetSize: 56, count: 3 },
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
            monitorId: result.id,
            status: deviceId === 3 ? "down" : deviceId === 5 ? "warning" : "online",
            responseTime: deviceId === 5 ? 120 : deviceId === 3 ? null : Math.floor(Math.random() * 20) + 10,
            details: deviceId === 3 ? { error: "Connection refused" } : 
                    deviceId === 5 ? { warning: "High latency" } : null,
            timestamp: new Date()
          });
      } catch (error) {
        console.error(`Error setting up monitor for device ${deviceId}:`, error);
      }
    }

    // Add HTTP monitor for web server
    try {
      const httpMonitor: InsertMonitor = {
        deviceId: 3, // Web Server
        type: "http",
        config: { 
          url: "http://192.168.1.100", 
          method: "GET", 
          expectedStatus: 200, 
          timeout: 5,
          validateSSL: false
        },
        enabled: true,
        interval: 60
      };

      const [httpResult] = await db
        .insert(monitors)
        .values({
          ...httpMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Add TCP monitor for database server
      const tcpMonitor: InsertMonitor = {
        deviceId: 4, // Database Server
        type: "tcp",
        config: { port: 5432, timeout: 5 },
        enabled: true,
        interval: 60
      };

      const [tcpResult] = await db
        .insert(monitors)
        .values({
          ...tcpMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Add some alerts
      const alertData: InsertAlert[] = [
        {
          deviceId: 3,
          monitorId: httpResult.id,
          message: "Web Server Offline",
          severity: "danger",
          status: "active"
        },
        {
          deviceId: 4,
          monitorId: tcpResult.id,
          message: "High CPU Usage",
          severity: "warning",
          status: "active"
        },
        {
          deviceId: 5,
          monitorId: 5, // ICMP monitor for AP
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