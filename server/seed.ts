import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import { devices, monitors, monitorResults, alerts } from "../shared/schema";
import type { InsertDevice, InsertMonitor, InsertAlert } from "../shared/schema";
import { storage, MemStorage } from "./storage";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Check if tables exist and if any data exists in the devices table
 */
async function shouldSeedDatabase() {
  try {
    // İlk olarak tabloların varlığını kontrol et
    const tablesQuery = `
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name IN ('devices', 'monitors', 'monitorResults', 'alerts')
      AND table_schema = 'public';
    `;
    
    // Sonra cihazlar tablosunda veri olup olmadığını kontrol et
    const deviceDataQuery = `
      SELECT COUNT(*) as count FROM devices;
    `;
    
    // Doğrudan veritabanına sorgu gönder
    if (process.env.DATABASE_URL) {
      // Veritabanı bağlantısını oluştur
      const postgres = await import('postgres');
      const sql = postgres.default(process.env.DATABASE_URL);
      
      // Tabloların varlığını kontrol et
      const tablesResult = await sql.unsafe(tablesQuery);
      
      if (tablesResult && tablesResult.length > 0) {
        const tablesCount = parseInt(tablesResult[0].count);
        
        // Eğer tüm tablolar mevcutsa, cihazlar tablosunda veri var mı kontrol et
        if (tablesCount >= 4) {
          try {
            const deviceDataResult = await sql.unsafe(deviceDataQuery);
            if (deviceDataResult && deviceDataResult.length > 0) {
              const deviceCount = parseInt(deviceDataResult[0].count);
              await sql.end();
              
              // Hiç cihaz verisi yoksa seed işlemi yap
              return deviceCount === 0;
            }
          } catch (error) {
            // Tablo var ama sorgu çalışmadıysa, muhtemelen tablonun yapısı doğru değil
            console.error("Error checking device data:", error);
            await sql.end();
            return true; // Seed işlemi yap
          }
        } else {
          // Tüm tablolar mevcut değilse seed işlemi yapma
          await sql.end();
          return false;
        }
      }
      await sql.end();
    }
    return false; // Varsayılan olarak seed işlemi yapma
  } catch (error) {
    console.error("Error checking database:", error);
    return false;
  }
}

/**
 * Seed the database with initial data
 */
export async function seedDatabase() {
  // Artık her zaman veritabanını kullanıyoruz
  console.log("Veritabanı seeding işlemi başlatılıyor...");

  try {
    // Check if we need to seed the database
    const shouldSeed = await shouldSeedDatabase();
    if (!shouldSeed) {
      console.log("Database already has data, skipping seed operation");
      return;
    }

    // Veritabanı boş olduğu için seed işlemi yapacağız
    console.log("Veritabanı boş, seed işlemi başlatılıyor...");

    console.log("Seeding database with initial data...");

    // Add sample devices with real world IPs
    const sampleDevices: InsertDevice[] = [
      { name: "Google DNS", ipAddress: "8.8.8.8", type: "server" },
      { name: "Cloudflare DNS", ipAddress: "1.1.1.1", type: "server" },
      { name: "Quad9 DNS", ipAddress: "9.9.9.9", type: "server" },
      { name: "OpenDNS", ipAddress: "208.67.222.222", type: "server" },
      { name: "Amazon AWS", ipAddress: "52.94.236.248", type: "server" },
      { name: "Microsoft Azure", ipAddress: "20.36.32.15", type: "server" },
      { name: "Google Cloud", ipAddress: "35.190.27.215", type: "server" },
      { name: "Cloudflare", ipAddress: "104.16.132.229", type: "server" },
      { name: "GitHub", ipAddress: "140.82.121.4", type: "server" },
      { name: "YouTube", ipAddress: "142.250.185.78", type: "server" },
      { name: "Facebook", ipAddress: "157.240.3.35", type: "server" },
      { name: "Twitter", ipAddress: "104.244.42.65", type: "server" }
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
          deviceId: deviceId,
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

    // Add HTTP monitors for web and mail servers
    try {
      // Google HTTP monitor
      const httpGoogleMonitor: InsertMonitor = {
        deviceId: deviceIds[0], // Google DNS (ilk cihaz)
        type: "http",
        config: { 
          url: "https://www.google.com", 
          method: "GET", 
          expectedStatus: 200, 
          timeout: 5,
          validateSsl: true
        },
        enabled: true,
        interval: 60
      };

      const [httpGoogleResult] = await db
        .insert(monitors)
        .values({
          ...httpGoogleMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      // Cloudflare HTTP monitor
      const httpCloudflareMonitor: InsertMonitor = {
        deviceId: deviceIds[1], // Cloudflare DNS (ikinci cihaz)
        type: "http",
        config: { 
          url: "https://www.cloudflare.com", 
          method: "GET", 
          expectedStatus: 200, 
          timeout: 5,
          validateSsl: true
        },
        enabled: true,
        interval: 60
      };

      const [httpCloudflareResult] = await db
        .insert(monitors)
        .values({
          ...httpCloudflareMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Add TCP monitors for major services
      const tcpGoogleMonitor: InsertMonitor = {
        deviceId: deviceIds[0], // Google DNS (ilk cihaz)
        type: "tcp",
        config: { port: 53, timeout: 5 },
        enabled: true,
        interval: 60
      };

      const [tcpGoogleResult] = await db
        .insert(monitors)
        .values({
          ...tcpGoogleMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      // GitHub SSH TCP monitor
      const tcpGitHubMonitor: InsertMonitor = {
        deviceId: deviceIds.length >= 9 ? deviceIds[8] : deviceIds[0], // GitHub veya Google DNS
        type: "tcp",
        config: { port: 22, timeout: 5 },
        enabled: true,
        interval: 60
      };

      const [tcpGitHubResult] = await db
        .insert(monitors)
        .values({
          ...tcpGitHubMonitor,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Add some alerts
      const alertData: InsertAlert[] = [
        {
          deviceId: deviceIds[0], // Google DNS
          monitorId: httpGoogleResult.id,
          message: "Google Service Offline",
          severity: "danger",
          status: "active"
        },
        {
          deviceId: deviceIds[1], // Cloudflare DNS
          monitorId: httpCloudflareResult.id,
          message: "Cloudflare Connection Issue",
          severity: "warning",
          status: "active"
        },
        {
          deviceId: deviceIds[0], // Google DNS
          monitorId: tcpGoogleResult.id,
          message: "Google DNS Error",
          severity: "danger",
          status: "active"
        },
        {
          deviceId: deviceIds.length >= 9 ? deviceIds[8] : deviceIds[0], // GitHub veya Google DNS
          monitorId: tcpGitHubResult.id,
          message: "GitHub SSH Connection Error",
          severity: "warning",
          status: "active"
        },
        {
          deviceId: deviceIds[2], // Quad9 DNS
          monitorId: deviceIds.length >= 3 ? deviceIds[2] : deviceIds[0], // İlgili cihazın monitör ID'si
          message: "Quad9 DNS Response Delay",
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