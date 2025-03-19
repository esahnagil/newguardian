import fs from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';

/**
 * Log Seviyesi
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log Renklerine
 */
const LogColors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m'   // Reset
};

/**
 * Log Konfigürasyonu
 */
interface LoggerConfig {
  logToFile: boolean;
  logToConsole: boolean;
  logFilePath: string;
  logFileMaxSize: number;       // Bayt cinsinden (örneğin 10 * 1024 * 1024 = 10MB)
  logFileMaxCount: number;      // Kaç adet log dosyası tutulacak
  logLevel: LogLevel;
  timestampFormat: string;
}

/**
 * Log Yönetim Servisi
 * 
 * Bu servis, uygulama log'larını yönetir, dosyalara yazar ve log dosyası rotasyonu yapar
 */
export class LoggerService {
  private static instance: LoggerService;
  private config: LoggerConfig;
  private logStream: WriteStream | null = null;
  private currentLogSize: number = 0;
  private currentLogFile: string = '';

  private constructor() {
    // Varsayılan konfigürasyon
    this.config = {
      logToFile: process.env.LOG_TO_FILE === 'true',
      logToConsole: process.env.LOG_TO_CONSOLE !== 'false',
      logFilePath: process.env.LOG_FILE_PATH || './logs',
      logFileMaxSize: parseInt(process.env.LOG_FILE_MAX_SIZE || '10485760'), // 10MB
      logFileMaxCount: parseInt(process.env.LOG_FILE_MAX_COUNT || '5'),
      logLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
      timestampFormat: process.env.LOG_TIMESTAMP_FORMAT || 'yyyy-MM-dd HH:mm:ss'
    };

    // Log dizinini oluştur
    if (this.config.logToFile) {
      this.initializeLogDirectory();
    }
  }

  /**
   * Servis singleton instance'ını al
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Log dizinini başlat
   */
  private initializeLogDirectory(): void {
    try {
      if (!fs.existsSync(this.config.logFilePath)) {
        fs.mkdirSync(this.config.logFilePath, { recursive: true });
      }
      this.openLogStream();
    } catch (error) {
      console.error('Log dizini oluşturulurken hata:', error);
      // Log dosyasına yazma devre dışı bırakılsın, sadece konsola yazılsın
      this.config.logToFile = false;
    }
  }

  /**
   * Log dosyası streamini aç
   */
  private openLogStream(): void {
    if (!this.config.logToFile) return;

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    this.currentLogFile = path.join(this.config.logFilePath, `app-${timestamp}.log`);
    
    this.logStream = createWriteStream(this.currentLogFile, { flags: 'a' });
    this.currentLogSize = 0;

    // Stream hataları dinle
    this.logStream.on('error', (error) => {
      console.error('Log dosyasına yazarken hata:', error);
      this.config.logToFile = false;
    });
  }

  /**
   * Log streamini kapat
   */
  private closeLogStream(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  /**
   * Log dosyalarını temizle (eski log dosyalarını sil)
   */
  private cleanupOldLogs(): void {
    try {
      const logDir = this.config.logFilePath;
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          created: fs.statSync(path.join(logDir, file)).birthtime.getTime()
        }))
        .sort((a, b) => b.created - a.created); // Yeniden eskiye sırala

      // Maksimum dosya sayısından fazlası varsa sil
      if (files.length > this.config.logFileMaxCount) {
        files.slice(this.config.logFileMaxCount).forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`Eski log dosyası silindi: ${file.name}`);
        });
      }
    } catch (error) {
      console.error('Eski log dosyaları temizlenirken hata:', error);
    }
  }

  /**
   * Log rotasyonu yap
   */
  private rotateLogFileIfNeeded(logSize: number): void {
    this.currentLogSize += logSize;
    
    if (this.currentLogSize >= this.config.logFileMaxSize) {
      this.closeLogStream();
      this.cleanupOldLogs();
      this.openLogStream();
    }
  }

  /**
   * Timestamp oluştur
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Log yaz
   */
  private log(level: LogLevel, message: string, meta?: any): void {
    // Log seviyesi kontrolü
    const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = logLevels.indexOf(this.config.logLevel);
    const currentLevelIndex = logLevels.indexOf(level);
    
    if (currentLevelIndex < configLevelIndex) {
      return; // Daha düşük öncelikli logları yazma
    }

    const timestamp = this.getTimestamp();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    
    // Konsola yaz
    if (this.config.logToConsole) {
      console.log(`${LogColors[level]}${logMessage}${LogColors.reset}`);
    }

    // Dosyaya yaz
    if (this.config.logToFile && this.logStream) {
      const logLine = `${logMessage}\n`;
      this.logStream.write(logLine);
      this.rotateLogFileIfNeeded(Buffer.byteLength(logLine));
    }
  }

  /**
   * Debug log
   */
  public debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  /**
   * Info log
   */
  public info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  /**
   * Uyarı log
   */
  public warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  /**
   * Hata log
   */
  public error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  /**
   * Log konfigürasyonunu güncelle
   */
  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Dosya loglaması değiştiyse
    if (oldConfig.logToFile !== this.config.logToFile) {
      if (this.config.logToFile) {
        this.initializeLogDirectory();
      } else {
        this.closeLogStream();
      }
    }
    
    // Log dizini değiştiyse
    if (oldConfig.logFilePath !== this.config.logFilePath && this.config.logToFile) {
      this.closeLogStream();
      this.initializeLogDirectory();
    }
    
    this.info('Log konfigürasyonu güncellendi', { 
      oldConfig: JSON.stringify(oldConfig),
      newConfig: JSON.stringify(this.config)
    });
  }

  /**
   * Kaynakları temizle
   */
  public cleanup(): void {
    this.closeLogStream();
  }
}

// Singleton instance
export const logger = LoggerService.getInstance();