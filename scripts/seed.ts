import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { 
  users, devices, monitors, monitorResults, alerts
} from "../shared/schema";

// Tip tanımlamaları
interface InsertDevice {
  name: string;
  ipAddress: string;
  type: string;
}

interface InsertMonitor {
  deviceId: number;
  type: string;
  config: any;
  enabled: boolean;
  interval: number;
}

interface InsertAlert {
  deviceId: number;
  monitorId: number;
  message: string;
  severity: string;
  status: string;
}

async function seedDatabase() {
  try {
    // Check if devices table is already populated
    const devicesCount = await db.select({ count: sql`count(*)` }).from(devices);
    
    if (parseInt(devicesCount[0].count) > 0) {
      console.log("Database already has data, skipping seed operation");
      return;
    }
    
    console.log("Seeding database with initial data...");

    // Sample devices data - Internet services
    const sampleDevices = [
      { name: "Google Search", ipAddress: "142.250.187.78", type: "server" },
      { name: "Amazon Web Services", ipAddress: "54.239.28.85", type: "server" },
      { name: "Cloudflare DNS", ipAddress: "1.1.1.1", type: "dns" },
      { name: "Microsoft Azure", ipAddress: "20.43.161.1", type: "server" },
      { name: "Alibaba Cloud", ipAddress: "140.205.94.189", type: "server" },
      { name: "Facebook", ipAddress: "157.240.192.35", type: "server" },
      { name: "Twitter", ipAddress: "104.244.42.1", type: "server" },
      { name: "Netflix CDN", ipAddress: "198.38.96.0", type: "cdn" },
      { name: "Akamai CDN", ipAddress: "23.15.146.169", type: "cdn" },
      { name: "GitHub", ipAddress: "140.82.121.4", type: "server" },
      { name: "Cloudfront CDN", ipAddress: "13.224.64.0", type: "cdn" },
      { name: "Fastly CDN", ipAddress: "151.101.1.164", type: "cdn" }
    ];

    // Insert devices and collect their IDs
    const deviceIds: number[] = [];
    
    for (const device of sampleDevices) {
      const result = await db.insert(devices).values({
        name: device.name,
        ip_address: device.ipAddress,
        type: device.type,
        created_at: new Date(),
        updated_at: new Date()
      }).returning();
      
      deviceIds.push(result[0].id);
    }

    // Add ICMP monitors for all devices
    for (let i = 0; i < deviceIds.length; i++) {
      const deviceId = deviceIds[i];
      
      // ICMP monitor
      const monitorResult = await db.insert(monitors).values({
        device_id: deviceId,
        type: "icmp",
        config: { timeout: 5, packetSize: 56, count: 3 },
        enabled: true,
        interval: 60,
        created_at: new Date(),
        updated_at: new Date()
      }).returning();
      
      const monitorId = monitorResult[0].id;
      
      // Initial monitor result
      await db.insert(monitorResults).values({
        monitor_id: monitorId,
        status: deviceId === 4 ? "down" : deviceId === 5 ? "warning" : "online",
        response_time: deviceId === 5 ? 120 : deviceId === 4 ? null : Math.floor(Math.random() * 20) + 10,
        details: deviceId === 4 ? { error: "Connection refused" } : 
                 deviceId === 5 ? { warning: "High latency" } : null,
        timestamp: new Date()
      });
    }

    // Add specialized monitors
    
    // Microsoft Azure HTTP monitor
    const httpAzureMonitor = await db.insert(monitors).values({
      device_id: deviceIds[3], // Microsoft Azure
      type: "http",
      config: { 
        url: "https://azure.microsoft.com", 
        method: "GET", 
        expectedStatus: 200, 
        timeout: 5,
        validateSSL: true
      },
      enabled: true,
      interval: 60,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    // Facebook HTTP monitor
    const httpFacebookMonitor = await db.insert(monitors).values({
      device_id: deviceIds[5], // Facebook
      type: "http",
      config: { 
        url: "https://facebook.com", 
        method: "GET", 
        expectedStatus: 200, 
        timeout: 5,
        validateSSL: true
      },
      enabled: true,
      interval: 60,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    // Alibaba Cloud TCP monitor
    const tcpAlibabaMonitor = await db.insert(monitors).values({
      device_id: deviceIds[4], // Alibaba Cloud
      type: "tcp",
      config: { port: 443, timeout: 5 },
      enabled: true,
      interval: 60,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    // Facebook TCP monitor
    const tcpFacebookMonitor = await db.insert(monitors).values({
      device_id: deviceIds[5], // Facebook
      type: "tcp",
      config: { port: 443, timeout: 5 },
      enabled: true,
      interval: 60,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    // Add some alerts
    const alertsData = [
      {
        device_id: deviceIds[3], // Microsoft Azure
        monitor_id: httpAzureMonitor[0].id,
        message: "Microsoft Azure HTTP Error",
        severity: "danger",
        status: "active"
      },
      {
        device_id: deviceIds[4], // Alibaba Cloud
        monitor_id: tcpAlibabaMonitor[0].id,
        message: "Alibaba Cloud High Latency",
        severity: "warning",
        status: "active"
      },
      {
        device_id: deviceIds[5], // Facebook
        monitor_id: httpFacebookMonitor[0].id,
        message: "Facebook Connection Error",
        severity: "danger",
        status: "active"
      },
      {
        device_id: deviceIds[5], // Facebook
        monitor_id: tcpFacebookMonitor[0].id,
        message: "Facebook SSL Certificate Issue",
        severity: "warning",
        status: "active"
      },
      {
        device_id: deviceIds[7], // Netflix CDN
        monitor_id: deviceIds[7] + 1, // Assuming the monitor ID follows device ID pattern
        message: "Netflix CDN Response Time Issue",
        severity: "warning",
        status: "active"
      }
    ];

    for (const alert of alertsData) {
      await db.insert(alerts).values({
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