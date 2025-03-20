import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertDeviceSchema, 
  insertMonitorSchema, 
  insertUserSchema, 
  updateUserSchema,
  userRoleEnum,
  userPreferencesSchema
} from "@shared/schema";
import { MonitorService } from "./services/monitor.service";
import { WebSocketServer, WebSocket } from "ws";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  app.use(express.json());
  app.use("/api", apiRouter);

  // Initialize the monitor service
  const monitorService = new MonitorService(storage);

  // Start monitoring process in background
  monitorService.startMonitoring();

  // Device routes
  apiRouter.get("/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  apiRouter.get("/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDevice(id);

      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  apiRouter.post("/devices", async (req, res) => {
    try {
      const result = insertDeviceSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid device data", errors: result.error.format() });
      }

      const device = await storage.createDevice(result.data);
      res.status(201).json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  apiRouter.put("/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertDeviceSchema.partial().safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid device data", errors: result.error.format() });
      }

      const updatedDevice = await storage.updateDevice(id, result.data);

      if (!updatedDevice) {
        return res.status(404).json({ message: "Device not found" });
      }

      res.json(updatedDevice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  apiRouter.delete("/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDevice(id);

      if (!success) {
        return res.status(404).json({ message: "Device not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Monitor routes
  apiRouter.get("/monitors", async (req, res) => {
    try {
      const deviceId = req.query.deviceId ? parseInt(req.query.deviceId as string) : undefined;

      let monitors;
      if (deviceId) {
        monitors = await storage.getMonitorsByDeviceId(deviceId);
      } else {
        monitors = await storage.getMonitors();
      }

      res.json(monitors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monitors" });
    }
  });

  apiRouter.get("/monitors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const monitor = await storage.getMonitor(id);

      if (!monitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      res.json(monitor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monitor" });
    }
  });

  apiRouter.post("/monitors", async (req, res) => {
    try {
      const result = insertMonitorSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid monitor data", errors: result.error.format() });
      }

      const monitor = await storage.createMonitor(result.data);
      res.status(201).json(monitor);
    } catch (error) {
      res.status(500).json({ message: "Failed to create monitor" });
    }
  });

  apiRouter.put("/monitors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertMonitorSchema.partial().safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid monitor data", errors: result.error.format() });
      }

      const updatedMonitor = await storage.updateMonitor(id, result.data);

      if (!updatedMonitor) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      res.json(updatedMonitor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update monitor" });
    }
  });

  apiRouter.delete("/monitors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMonitor(id);

      if (!success) {
        return res.status(404).json({ message: "Monitor not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete monitor" });
    }
  });

  // Monitor results routes
  apiRouter.get("/monitor-results/:monitorId", async (req, res) => {
    try {
      const monitorId = parseInt(req.params.monitorId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const results = await storage.getMonitorResults(monitorId, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monitor results" });
    }
  });

  apiRouter.get("/monitor-results/:monitorId/latest", async (req, res) => {
    try {
      const monitorId = parseInt(req.params.monitorId);
      const result = await storage.getLatestMonitorResult(monitorId);

      if (!result) {
        return res.status(404).json({ message: "No results found for this monitor" });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest monitor result" });
    }
  });

  // Alert routes
  apiRouter.get("/alerts", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const deviceId = req.query.deviceId ? parseInt(req.query.deviceId as string) : undefined;

      let alerts;
      if (deviceId) {
        alerts = await storage.getAlertsByDeviceId(deviceId);
        if (status) {
          alerts = alerts.filter(alert => alert.status === status);
        }
      } else {
        alerts = await storage.getAlerts(status);
      }

      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  apiRouter.get("/alerts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.getAlert(id);

      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }

      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alert" });
    }
  });

  apiRouter.put("/alerts/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const statusSchema = z.object({
        status: z.enum(["active", "acknowledged", "escalated", "resolved"])
      });

      const result = statusSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid status", errors: result.error.format() });
      }

      const updatedAlert = await storage.updateAlertStatus(id, result.data.status);

      if (!updatedAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }

      res.json(updatedAlert);
    } catch (error) {
      res.status(500).json({ message: "Failed to update alert status" });
    }
  });

  // User routes
  apiRouter.get("/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Gizlilik için şifreleri gönderme
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcılar getirilirken hata oluştu" });
    }
  });

  apiRouter.get("/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Gizlilik için şifreyi gönderme
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı getirilirken hata oluştu" });
    }
  });

  apiRouter.post("/users", async (req, res) => {
    try {
      // Şifre doğrulama eklentisi
      const passwordSchema = z.object({
        password: z.string().min(8, "Şifre en az 8 karakter olmalıdır")
          .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
          .regex(/[a-z]/, "En az bir küçük harf içermelidir")
          .regex(/[0-9]/, "En az bir rakam içermelidir")
      });

      // Kullanıcı rolü validasyonu
      const roleSchema = z.object({
        role: z.enum(userRoleEnum as [string, ...string[]])
      });

      // insertUserSchema ile birleştir
      const createUserSchema = insertUserSchema
        .merge(passwordSchema)
        .merge(roleSchema.partial());

      const result = createUserSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          message: "Geçersiz kullanıcı verisi", 
          errors: result.error.format() 
        });
      }

      const user = await storage.createUser(result.data);
      
      // Gizlilik için şifreyi gönderme
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Kullanıcı oluşturma hatası:", error);
      res.status(500).json({ message: "Kullanıcı oluşturulurken hata oluştu" });
    }
  });

  apiRouter.put("/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Şifre değişikliği içeriyorsa validasyon uygula
      let schema = updateUserSchema;
      if (req.body.password) {
        schema = schema.extend({
          password: z.string().min(8, "Şifre en az 8 karakter olmalıdır")
            .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
            .regex(/[a-z]/, "En az bir küçük harf içermelidir")
            .regex(/[0-9]/, "En az bir rakam içermelidir")
        });
      }

      // Eğer rol güncellemesi varsa, enum içinden olduğunu kontrol et
      if (req.body.role) {
        schema = schema.extend({
          role: z.enum(userRoleEnum as [string, ...string[]])
        });
      }

      const result = schema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          message: "Geçersiz kullanıcı verisi", 
          errors: result.error.format() 
        });
      }

      const updatedUser = await storage.updateUser(id, result.data);

      if (!updatedUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Gizlilik için şifreyi gönderme
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Kullanıcı güncelleme hatası:", error);
      res.status(500).json({ message: "Kullanıcı güncellenirken hata oluştu" });
    }
  });

  apiRouter.put("/users/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const statusSchema = z.object({
        isActive: z.boolean()
      });

      const result = statusSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          message: "Geçersiz durum değeri", 
          errors: result.error.format() 
        });
      }

      const updatedUser = await storage.updateUserStatus(id, result.data.isActive);

      if (!updatedUser) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Gizlilik için şifreyi gönderme
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı durumu güncellenirken hata oluştu" });
    }
  });

  apiRouter.delete("/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);

      if (!success) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı silinirken hata oluştu" });
    }
  });

  apiRouter.put("/users/:id/preferences", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = userPreferencesSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          message: "Geçersiz tercih verisi", 
          errors: result.error.format() 
        });
      }

      // Önce kullanıcıyı getir
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Tercihleri güncelle
      const updatedUser = await storage.updateUser(id, {
        preferences: result.data
      });

      // Gizlilik için şifreyi gönderme
      const { password, ...safeUser } = updatedUser!;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı tercihleri güncellenirken hata oluştu" });
    }
  });

  // Dashboard summary route
  apiRouter.get("/dashboard/summary", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const monitors = await storage.getMonitors();
      const activeAlerts = (await storage.getAlerts("active")).length;

      // Calculate device statistics
      const onlineDevices = new Set<number>();
      const webServicesCount = { total: 0, online: 0 };
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      // For each monitor, get the latest result
      for (const monitor of monitors) {
        const latestResult = await storage.getLatestMonitorResult(monitor.id);

        if (latestResult) {
          if (latestResult.status === "online") {
            onlineDevices.add(monitor.deviceId);

            if (latestResult.responseTime) {
              totalResponseTime += latestResult.responseTime;
              responseTimeCount++;
            }
          }

          if (monitor.type === "http") {
            webServicesCount.total++;
            if (latestResult.status === "online") {
              webServicesCount.online++;
            }
          }
        }
      }

      const averageResponseTime = responseTimeCount > 0 
        ? Math.round(totalResponseTime / responseTimeCount) 
        : 0;

      const summary = {
        devices: {
          total: devices.length,
          online: onlineDevices.size,
          percentage: devices.length > 0 ? Math.round((onlineDevices.size / devices.length) * 100) : 0
        },
        webServices: {
          total: webServicesCount.total,
          online: webServicesCount.online,
          percentage: webServicesCount.total > 0 ? Math.round((webServicesCount.online / webServicesCount.total) * 100) : 0
        },
        activeAlerts,
        averageResponseTime
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time updates on a specific path to avoid conflicts with Vite
  console.log("Setting up WebSocket server on path: /ws/monitoring");
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/monitoring'
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send initial data
    storage.getDevices().then(devices => {
      ws.send(JSON.stringify({ type: 'devices', data: devices }));
    });

    storage.getAlerts('active').then(alerts => {
      ws.send(JSON.stringify({ type: 'alerts', data: alerts }));
    });

    // Monitor for new alerts or status changes
    monitorService.registerEventListener((event, data) => {
      ws.send(JSON.stringify({ type: event, data }));
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      // Clean up event listeners
      monitorService.removeEventListeners();
    });
  });

  return httpServer;
}