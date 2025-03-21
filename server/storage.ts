import { 
  users, 
  devices, 
  monitors, 
  monitorResults, 
  alerts,
  type User, 
  type InsertUser,
  type Device,
  type InsertDevice,
  type Monitor,
  type InsertMonitor,
  type MonitorResult,
  type Alert,
  type InsertAlert
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserStatus(id: number, isActive: boolean): Promise<User | undefined>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Device management
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  
  // Monitor management
  getMonitors(): Promise<Monitor[]>;
  getMonitorsByDeviceId(deviceId: number): Promise<Monitor[]>;
  getMonitor(id: number): Promise<Monitor | undefined>;
  createMonitor(monitor: InsertMonitor): Promise<Monitor>;
  updateMonitor(id: number, monitor: Partial<InsertMonitor>): Promise<Monitor | undefined>;
  deleteMonitor(id: number): Promise<boolean>;
  
  // Monitor results
  getLatestMonitorResult(monitorId: number): Promise<MonitorResult | undefined>;
  getMonitorResults(monitorId: number, limit: number): Promise<MonitorResult[]>;
  createMonitorResult(monitorId: number, status: string, responseTime?: number, details?: any): Promise<MonitorResult>;
  
  // Alerts management
  getAlerts(status?: string): Promise<Alert[]>;
  getAlertsByDeviceId(deviceId: number): Promise<Alert[]>;
  getAlert(id: number): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlertStatus(id: number, status: string): Promise<Alert | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private monitors: Map<number, Monitor>;
  private monitorResults: Map<number, MonitorResult[]>;
  private alerts: Map<number, Alert>;
  
  private currentUserId: number;
  private currentDeviceId: number;
  private currentMonitorId: number;
  private currentResultId: number;
  private currentAlertId: number;
  
  // Maksimum saklama limiti - her monitör için bu kadar sonuç saklanır
  private maxResultsPerMonitor: number = 100;

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.monitors = new Map();
    this.monitorResults = new Map();
    this.alerts = new Map();
    
    this.currentUserId = 1;
    this.currentDeviceId = 1;
    this.currentMonitorId = 1;
    this.currentResultId = 1;
    this.currentAlertId = 1;
    
    // Add some sample devices for testing
    this.initializeData();
  }
  
  private initializeData() {
    // Add a few sample devices with real-world services
    const sampleDevices: InsertDevice[] = [
      { name: "Google DNS", ipAddress: "8.8.8.8", type: "router" },
      { name: "Cloudflare DNS", ipAddress: "1.1.1.1", type: "router" },
      { name: "Google Web", ipAddress: "142.250.187.78", type: "server" },
      { name: "Cloudflare CDN", ipAddress: "104.16.132.229", type: "server" },
      { name: "Amazon AWS", ipAddress: "176.32.103.205", type: "server" }
    ];
    
    // Tüm eski verileri temizleyelim
    this.users.clear();
    this.devices.clear();
    this.monitors.clear();
    this.monitorResults.clear();
    this.alerts.clear();
    
    // ID'leri sıfırlayalım
    this.currentUserId = 1;
    this.currentDeviceId = 1;
    this.currentMonitorId = 1;
    this.currentResultId = 1;
    this.currentAlertId = 1;
    
    sampleDevices.forEach(device => this.createDevice(device));
    
    // Add ICMP monitors for each device
    for (let i = 1; i <= sampleDevices.length; i++) {
      this.createMonitor({
        deviceId: i,
        type: "icmp",
        config: { timeout: 5, packetSize: 56, count: 3 },
        enabled: true,
        interval: 60
      });
    }
    
    // Add HTTP monitor for Google Web
    this.createMonitor({
      deviceId: 3,
      type: "http",
      config: { 
        url: "https://www.google.com", 
        method: "GET", 
        expectedStatus: 200, 
        timeout: 5,
        validateSSL: true
      },
      enabled: true,
      interval: 60
    });
    
    // Add HTTP monitor for Cloudflare CDN
    this.createMonitor({
      deviceId: 4,
      type: "http",
      config: { 
        url: "https://www.cloudflare.com", 
        method: "GET", 
        expectedStatus: 200, 
        timeout: 5,
        validateSSL: true
      },
      enabled: true,
      interval: 60
    });
    
    // Add TCP monitor for Amazon AWS
    this.createMonitor({
      deviceId: 5,
      type: "tcp",
      config: { port: 443, timeout: 5 },
      enabled: true,
      interval: 60
    });
    
    // Add some initial monitor results
    this.createMonitorResult(1, "online", 12, null);
    this.createMonitorResult(2, "online", 15, null);
    this.createMonitorResult(3, "down", null, { error: "Connection refused" });
    this.createMonitorResult(4, "online", 18, null);
    this.createMonitorResult(5, "warning", 120, { warning: "High latency" });
    
    // Add some alerts
    this.createAlert({
      deviceId: 3,
      monitorId: 3,
      message: "Google Web Yüksek Gecikme",
      severity: "warning",
      status: "active"
    });
    
    this.createAlert({
      deviceId: 4,
      monitorId: 4,
      message: "Cloudflare CDN Erişilemez",
      severity: "danger",
      status: "active"
    });
    
    this.createAlert({
      deviceId: 5,
      monitorId: 5,
      message: "Amazon AWS TCP Bağlantı Hatası",
      severity: "danger",
      status: "active"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt, 
      updatedAt,
      lastLoginAt: null,
      preferences: insertUser.preferences || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, partialUser: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...partialUser,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserStatus(id: number, isActive: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      isActive,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Device methods
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }
  
  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }
  
  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.currentDeviceId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const device: Device = { ...insertDevice, id, createdAt, updatedAt };
    this.devices.set(id, device);
    return device;
  }
  
  async updateDevice(id: number, partialDevice: Partial<InsertDevice>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice: Device = {
      ...device,
      ...partialDevice,
      updatedAt: new Date()
    };
    
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async deleteDevice(id: number): Promise<boolean> {
    // Delete all monitors for this device
    const deviceMonitors = await this.getMonitorsByDeviceId(id);
    for (const monitor of deviceMonitors) {
      await this.deleteMonitor(monitor.id);
    }
    
    return this.devices.delete(id);
  }
  
  // Monitor methods
  async getMonitors(): Promise<Monitor[]> {
    return Array.from(this.monitors.values());
  }
  
  async getMonitorsByDeviceId(deviceId: number): Promise<Monitor[]> {
    return Array.from(this.monitors.values()).filter(monitor => monitor.deviceId === deviceId);
  }
  
  async getMonitor(id: number): Promise<Monitor | undefined> {
    return this.monitors.get(id);
  }
  
  async createMonitor(insertMonitor: InsertMonitor): Promise<Monitor> {
    const id = this.currentMonitorId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const monitor: Monitor = { ...insertMonitor, id, createdAt, updatedAt };
    this.monitors.set(id, monitor);
    return monitor;
  }
  
  async updateMonitor(id: number, partialMonitor: Partial<InsertMonitor>): Promise<Monitor | undefined> {
    const monitor = this.monitors.get(id);
    if (!monitor) return undefined;
    
    const updatedMonitor: Monitor = {
      ...monitor,
      ...partialMonitor,
      updatedAt: new Date()
    };
    
    this.monitors.set(id, updatedMonitor);
    return updatedMonitor;
  }
  
  async deleteMonitor(id: number): Promise<boolean> {
    // Delete all results for this monitor
    this.monitorResults.delete(id);
    
    return this.monitors.delete(id);
  }
  
  // Monitor results methods
  async getLatestMonitorResult(monitorId: number): Promise<MonitorResult | undefined> {
    const results = this.monitorResults.get(monitorId);
    if (!results || results.length === 0) return undefined;
    
    return results[results.length - 1];
  }
  
  async getMonitorResults(monitorId: number, limit: number): Promise<MonitorResult[]> {
    const results = this.monitorResults.get(monitorId) || [];
    return results.slice(-limit);
  }
  
  async createMonitorResult(
    monitorId: number, 
    status: string, 
    responseTime?: number, 
    details?: any
  ): Promise<MonitorResult> {
    const id = this.currentResultId++;
    const timestamp = new Date();
    const result: MonitorResult = { id, monitorId, timestamp, status, responseTime, details };
    
    // Mevcut sonuçları al
    let existingResults = this.monitorResults.get(monitorId) || [];
    
    // Yeni sonucu ekle
    const updatedResults = [...existingResults, result];
    
    // Maksimum limit aşılırsa, eski sonuçları kaldır
    if (updatedResults.length > this.maxResultsPerMonitor) {
      // Sonuçları son eklenenden ilk eklenene doğru sırala ve sadece en son maxResultsPerMonitor kadarını tut
      const limitedResults = updatedResults.slice(-this.maxResultsPerMonitor);
      this.monitorResults.set(monitorId, limitedResults);
      console.log(`[Storage] Limited monitor ${monitorId} results to ${limitedResults.length} entries (removed ${updatedResults.length - limitedResults.length})`);
    } else {
      this.monitorResults.set(monitorId, updatedResults);
    }
    
    return result;
  }
  
  // Alerts methods
  async getAlerts(status?: string): Promise<Alert[]> {
    const allAlerts = Array.from(this.alerts.values());
    if (status) {
      return allAlerts.filter(alert => alert.status === status);
    }
    return allAlerts;
  }
  
  async getAlertsByDeviceId(deviceId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.deviceId === deviceId);
  }
  
  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }
  
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const timestamp = new Date();
    const alert: Alert = { ...insertAlert, id, timestamp, acknowledgedAt: null, resolvedAt: null };
    this.alerts.set(id, alert);
    return alert;
  }
  
  async updateAlertStatus(id: number, status: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updatedAlert: Alert = {
      ...alert,
      status
    };
    
    if (status === 'acknowledged' && !alert.acknowledgedAt) {
      updatedAlert.acknowledgedAt = new Date();
    }
    
    if (status === 'resolved' && !alert.resolvedAt) {
      updatedAlert.resolvedAt = new Date();
    }
    
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const now = new Date();
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: now,
        updatedAt: now,
        preferences: insertUser.preferences || null
      })
      .returning();
    return user;
  }
  
  async updateUser(id: number, partialUser: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...partialUser,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async updateUserStatus(id: number, isActive: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        lastLoginAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }
  
  // Device methods
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }
  
  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }
  
  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const now = new Date();
    const [device] = await db
      .insert(devices)
      .values({
        ...insertDevice,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return device;
  }
  
  async updateDevice(id: number, partialDevice: Partial<InsertDevice>): Promise<Device | undefined> {
    const [updatedDevice] = await db
      .update(devices)
      .set({
        ...partialDevice,
        updatedAt: new Date()
      })
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice || undefined;
  }
  
  async deleteDevice(id: number): Promise<boolean> {
    // Delete all monitors for this device (cascade delete)
    const deviceMonitors = await this.getMonitorsByDeviceId(id);
    for (const monitor of deviceMonitors) {
      await this.deleteMonitor(monitor.id);
    }
    
    const result = await db
      .delete(devices)
      .where(eq(devices.id, id))
      .returning();
    
    return result.length > 0;
  }
  
  // Monitor methods
  async getMonitors(): Promise<Monitor[]> {
    return await db.select().from(monitors);
  }
  
  async getMonitorsByDeviceId(deviceId: number): Promise<Monitor[]> {
    return await db
      .select()
      .from(monitors)
      .where(eq(monitors.deviceId, deviceId));
  }
  
  async getMonitor(id: number): Promise<Monitor | undefined> {
    const [monitor] = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, id));
    return monitor || undefined;
  }
  
  async createMonitor(insertMonitor: InsertMonitor): Promise<Monitor> {
    const now = new Date();
    const [monitor] = await db
      .insert(monitors)
      .values({
        ...insertMonitor,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return monitor;
  }
  
  async updateMonitor(id: number, partialMonitor: Partial<InsertMonitor>): Promise<Monitor | undefined> {
    const [updatedMonitor] = await db
      .update(monitors)
      .set({
        ...partialMonitor,
        updatedAt: new Date()
      })
      .where(eq(monitors.id, id))
      .returning();
    return updatedMonitor || undefined;
  }
  
  async deleteMonitor(id: number): Promise<boolean> {
    // Delete all results for this monitor
    await db
      .delete(monitorResults)
      .where(eq(monitorResults.monitorId, id));
    
    const result = await db
      .delete(monitors)
      .where(eq(monitors.id, id))
      .returning();
    
    return result.length > 0;
  }
  
  // Monitor results methods
  async getLatestMonitorResult(monitorId: number): Promise<MonitorResult | undefined> {
    const [result] = await db
      .select()
      .from(monitorResults)
      .where(eq(monitorResults.monitorId, monitorId))
      .orderBy(desc(monitorResults.timestamp))
      .limit(1);
      
    return result || undefined;
  }
  
  async getMonitorResults(monitorId: number, limit: number): Promise<MonitorResult[]> {
    return await db
      .select()
      .from(monitorResults)
      .where(eq(monitorResults.monitorId, monitorId))
      .orderBy(desc(monitorResults.timestamp))
      .limit(limit);
  }
  
  async createMonitorResult(
    monitorId: number, 
    status: string, 
    responseTime?: number, 
    details?: any
  ): Promise<MonitorResult> {
    const [result] = await db
      .insert(monitorResults)
      .values({
        monitorId: monitorId,
        status,
        responseTime: responseTime || null,
        details: details || {},
        timestamp: new Date()
      })
      .returning();
    
    return result;
  }
  
  // Alerts methods
  async getAlerts(status?: string): Promise<Alert[]> {
    if (status) {
      return await db
        .select()
        .from(alerts)
        .where(eq(alerts.status, status))
        .orderBy(desc(alerts.timestamp));
    }
    
    return await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.timestamp));
  }
  
  async getAlertsByDeviceId(deviceId: number): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.deviceId, deviceId))
      .orderBy(desc(alerts.timestamp));
  }
  
  async getAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id));
    return alert || undefined;
  }
  
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values({
        ...insertAlert,
        timestamp: new Date()
      })
      .returning();
      
    return alert;
  }
  
  async updateAlertStatus(id: number, status: string): Promise<Alert | undefined> {
    const now = new Date();
    const alertUpdate: any = { status };
    
    if (status === 'acknowledged') {
      alertUpdate.acknowledgedAt = now;
    }
    
    if (status === 'resolved') {
      alertUpdate.resolvedAt = now;
    }
    
    const [updatedAlert] = await db
      .update(alerts)
      .set(alertUpdate)
      .where(eq(alerts.id, id))
      .returning();
      
    return updatedAlert || undefined;
  }
}

// Artık daima veritabanını kullanıyoruz
export const storage = new DatabaseStorage();