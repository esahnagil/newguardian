import { db } from "../server/db";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";

async function seedDatabase() {
  try {
    // Check if devices table is already populated
    const devicesCount = await db.select({ count: sql`count(*)` }).from(schema.devices);
    
    if (parseInt(devicesCount[0].count) > 0) {
      console.log("Database already has data, skipping seed operation");
      return;
    }
    
    console.log("Seeding database with initial data...");

    // Sample devices data
    const sampleDevices = [
      { name: "Core Router", ipAddress: "192.168.1.1", type: "router" },
      { name: "Main Switch", ipAddress: "192.168.1.2", type: "switch" },
      { name: "Distribution Switch", ipAddress: "192.168.1.3", type: "switch" },
      { name: "Web Server", ipAddress: "192.168.1.100", type: "server" },
      { name: "Database Server", ipAddress: "192.168.1.101", type: "server" },
      { name: "Mail Server", ipAddress: "192.168.1.102", type: "server" },
      { name: "Backup Server", ipAddress: "192.168.1.103", type: "server" },
      { name: "AP Office 1", ipAddress: "192.168.1.150", type: "access_point" },
      { name: "AP Office 2", ipAddress: "192.168.1.151", type: "access_point" },
      { name: "AP Meeting Room", ipAddress: "192.168.1.152", type: "access_point" },
      { name: "Firewall", ipAddress: "192.168.1.254", type: "firewall" },
      { name: "NAS Storage", ipAddress: "192.168.1.200", type: "storage" }
    ];

    // Insert devices and collect their IDs
    const deviceIds: number[] = [];
    
    for (const device of sampleDevices) {
      const result = await db.insert(schema.devices).values({
        name: device.name,
        ipAddress: device.ipAddress,
        type: device.type,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      deviceIds.push(result[0].id);
    }

    // Add ICMP monitors for all devices
    for (let i = 0; i < deviceIds.length; i++) {
      const deviceId = deviceIds[i];
      
      // ICMP monitor
      const monitorResult = await db.insert(schema.monitors).values({
        deviceId,
        type: "icmp",
        config: { timeout: 5, packetSize: 56, count: 3 },
        enabled: true,
        interval: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      const monitorId = monitorResult[0].id;
      
      // Initial monitor result
      await db.insert(schema.monitorResults).values({
        monitorId,
        status: deviceId === 4 ? "down" : deviceId === 5 ? "warning" : "online",
        responseTime: deviceId === 5 ? 120 : deviceId === 4 ? null : Math.floor(Math.random() * 20) + 10,
        details: deviceId === 4 ? { error: "Connection refused" } : 
                 deviceId === 5 ? { warning: "High latency" } : null,
        timestamp: new Date()
      });
    }

    // Add specialized monitors
    
    // Web Server HTTP monitor
    const httpWebMonitor = await db.insert(schema.monitors).values({
      deviceId: deviceIds[3], // Web Server
      type: "http",
      config: { 
        url: "http://192.168.1.100", 
        method: "GET", 
        expectedStatus: 200, 
        timeout: 5,
        validateSSL: false
      },
      enabled: true,
      interval: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Mail Server HTTP monitor
    const httpMailMonitor = await db.insert(schema.monitors).values({
      deviceId: deviceIds[5], // Mail Server
      type: "http",
      config: { 
        url: "http://192.168.1.102/webmail", 
        method: "GET", 
        expectedStatus: 200, 
        timeout: 5,
        validateSSL: false
      },
      enabled: true,
      interval: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Database Server TCP monitor
    const tcpDBMonitor = await db.insert(schema.monitors).values({
      deviceId: deviceIds[4], // Database Server
      type: "tcp",
      config: { port: 5432, timeout: 5 },
      enabled: true,
      interval: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Mail Server SMTP TCP monitor
    const tcpMailMonitor = await db.insert(schema.monitors).values({
      deviceId: deviceIds[5], // Mail Server
      type: "tcp",
      config: { port: 25, timeout: 5 },
      enabled: true,
      interval: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Add some alerts
    const alerts = [
      {
        deviceId: deviceIds[3],
        monitorId: httpWebMonitor[0].id,
        message: "Web Server Offline",
        severity: "danger",
        status: "active"
      },
      {
        deviceId: deviceIds[4],
        monitorId: tcpDBMonitor[0].id,
        message: "High CPU Usage",
        severity: "warning",
        status: "active"
      },
      {
        deviceId: deviceIds[5],
        monitorId: httpMailMonitor[0].id,
        message: "Mail Server HTTP Error",
        severity: "danger",
        status: "active"
      },
      {
        deviceId: deviceIds[5],
        monitorId: tcpMailMonitor[0].id,
        message: "Mail Server SMTP Error",
        severity: "warning",
        status: "active"
      },
      {
        deviceId: deviceIds[7], // AP Office 1
        monitorId: deviceIds[7] + 1, // Assuming the monitor ID follows device ID pattern
        message: "AP Response Time",
        severity: "warning",
        status: "active"
      }
    ];

    for (const alert of alerts) {
      await db.insert(schema.alerts).values({
        ...alert,
        timestamp: new Date()
      });
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

// Execute the seed function
seedDatabase()
  .then(() => {
    console.log("Seed operation completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("Seed operation failed:", error);
    process.exit(1);
  });