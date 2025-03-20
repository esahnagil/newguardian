import { Alert } from '@shared/schema';
import { config } from 'dotenv';
import axios from 'axios';

config(); // Çevre değişkenlerini yükle

/**
 * Bildirim Konfigürasyonu
 */
export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      }
    }
  };
  sms?: {
    enabled: boolean;
    recipients: string[];
    provider: 'twilio' | 'custom';
    apiConfig?: {
      accountSid?: string;
      authToken?: string;
      fromNumber?: string;
      apiUrl?: string;
    }
  };
  webhook?: {
    enabled: boolean;
    urls: string[];
    headers?: Record<string, string>;
  };
  telegram?: {
    enabled: boolean;
    botToken?: string;
    chatIds: string[];
  };
}

/**
 * Bildirim Hizmeti 
 * 
 * Bu servis, e-posta, SMS, Telegram ve webhook aracılığıyla 
 * alarm bildirimlerini gönderir
 */
export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationConfig = {
    email: {
      enabled: false,
      recipients: []
    },
    sms: {
      enabled: false,
      recipients: [],
      provider: 'twilio'
    },
    webhook: {
      enabled: false,
      urls: []
    },
    telegram: {
      enabled: false,
      chatIds: []
    }
  };

  private constructor() {
    // SMS, e-posta ve webhook konfigürasyonlarını çevre değişkenlerinden yükle
    this.loadConfig();
  }

  /**
   * Servis singleton instance'ını al
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Bildirim ayarlarını çevre değişkenlerinden yükle
   */
  private loadConfig() {
    // E-posta ayarlarını yükle
    if (process.env.EMAIL_ENABLED === 'true') {
      this.config.email!.enabled = true;
      this.config.email!.recipients = (process.env.EMAIL_RECIPIENTS || '').split(',');
      
      if (process.env.SMTP_HOST) {
        this.config.email!.smtpConfig = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        };
      }
    }

    // SMS ayarlarını yükle
    if (process.env.SMS_ENABLED === 'true') {
      this.config.sms!.enabled = true;
      this.config.sms!.recipients = (process.env.SMS_RECIPIENTS || '').split(',');
      this.config.sms!.provider = (process.env.SMS_PROVIDER as 'twilio' | 'custom') || 'twilio';
      
      this.config.sms!.apiConfig = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_PHONE_NUMBER,
        apiUrl: process.env.SMS_API_URL
      };
    }

    // Webhook ayarlarını yükle
    if (process.env.WEBHOOK_ENABLED === 'true') {
      this.config.webhook!.enabled = true;
      this.config.webhook!.urls = (process.env.WEBHOOK_URLS || '').split(',');
      
      try {
        this.config.webhook!.headers = process.env.WEBHOOK_HEADERS ? 
          JSON.parse(process.env.WEBHOOK_HEADERS) : undefined;
      } catch (e) {
        console.error('Webhook headers JSON parsing error:', e);
      }
    }

    // Telegram ayarlarını yükle
    if (process.env.TELEGRAM_ENABLED === 'true') {
      this.config.telegram!.enabled = true;
      this.config.telegram!.botToken = process.env.TELEGRAM_BOT_TOKEN;
      this.config.telegram!.chatIds = (process.env.TELEGRAM_CHAT_IDS || '').split(',');
    }
  }

  /**
   * Bildirim konfigürasyonunu güncelle
   */
  public updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Alarm bildirimi gönder
   */
  public async sendAlertNotification(alert: Alert): Promise<{
    email: boolean;
    sms: boolean;
    webhook: boolean;
    telegram: boolean;
  }> {
    const results = {
      email: false,
      sms: false,
      webhook: false,
      telegram: false
    };

    // Yalnızca aktif alarmlar için bildirim gönder
    if (alert.status !== 'active') {
      return results;
    }

    // Bildirim mesajını hazırla
    const subject = `[${alert.severity.toUpperCase()}] Network Alert - ${alert.message}`;
    const message = this.formatAlertMessage(alert);

    // E-posta bildirimi
    if (this.config.email?.enabled && this.config.email.recipients.length > 0) {
      try {
        results.email = await this.sendEmail(subject, message);
      } catch (error) {
        console.error('E-posta gönderme hatası:', error);
      }
    }

    // SMS bildirimi
    if (this.config.sms?.enabled && this.config.sms.recipients.length > 0) {
      try {
        results.sms = await this.sendSMS(subject, message);
      } catch (error) {
        console.error('SMS gönderme hatası:', error);
      }
    }

    // Webhook bildirimi
    if (this.config.webhook?.enabled && this.config.webhook.urls.length > 0) {
      try {
        results.webhook = await this.sendWebhook(alert);
      } catch (error) {
        console.error('Webhook gönderme hatası:', error);
      }
    }

    // Telegram bildirimi
    if (this.config.telegram?.enabled && this.config.telegram.chatIds.length > 0) {
      try {
        results.telegram = await this.sendTelegram(message);
      } catch (error) {
        console.error('Telegram gönderme hatası:', error);
      }
    }

    return results;
  }

  /**
   * E-posta bildirimi gönder
   */
  private async sendEmail(subject: string, message: string): Promise<boolean> {
    // Bu kısımda bir e-posta kütüphanesi (nodemailer gibi) kullanılabilir
    // Şimdilik sadece konsola yazdıralım ve başarılı kabul edelim
    console.log(`[E-POSTA BİLDİRİMİ] Konu: ${subject}, Alıcılar: ${this.config.email?.recipients.join(', ')}`);
    console.log(`[E-POSTA İÇERİĞİ] ${message}`);

    // TODO: Nodemailer veya benzeri bir kütüphane ile gerçek e-posta gönderimi
    return true;
  }

  /**
   * SMS bildirimi gönder
   */
  private async sendSMS(subject: string, message: string): Promise<boolean> {
    // Twilio API veya diğer SMS sağlayıcıları ile entegrasyon
    if (this.config.sms?.provider === 'twilio') {
      console.log(`[SMS BİLDİRİMİ] (Twilio) Mesaj: ${subject}, Alıcılar: ${this.config.sms?.recipients.join(', ')}`);
      // TODO: Twilio ile gerçek SMS gönderimi
    } else {
      console.log(`[SMS BİLDİRİMİ] (Özel API) Mesaj: ${subject}, Alıcılar: ${this.config.sms?.recipients.join(', ')}`);
      // TODO: Özel SMS API ile entegrasyon
    }
    
    return true;
  }

  /**
   * Webhook bildirimi gönder
   */
  private async sendWebhook(alert: Alert): Promise<boolean> {
    if (!this.config.webhook?.urls.length) {
      return false;
    }

    const payload = {
      type: 'networkAlert',
      alert: {
        id: alert.id,
        deviceId: alert.deviceId,
        monitorId: alert.monitorId,
        message: alert.message,
        severity: alert.severity,
        status: alert.status,
        timestamp: alert.timestamp
      }
    };

    const headers = this.config.webhook.headers || {
      'Content-Type': 'application/json'
    };

    try {
      // Tüm webhook URL'lerine POST isteği gönder
      const promises = this.config.webhook.urls.map(url => 
        axios.post(url, payload, { headers })
      );
      
      await Promise.all(promises);
      console.log(`[WEBHOOK] ${this.config.webhook.urls.length} webhook gönderildi`);
      return true;
    } catch (error) {
      console.error('Webhook gönderme hatası:', error);
      return false;
    }
  }

  /**
   * Telegram bildirimi gönder
   */
  private async sendTelegram(message: string): Promise<boolean> {
    if (!this.config.telegram?.enabled || !this.config.telegram.botToken) {
      return false;
    }

    try {
      const telegramApiUrl = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;
      
      // Her chat ID'sine mesaj gönder
      const promises = this.config.telegram.chatIds.map(chatId => 
        axios.post(telegramApiUrl, {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      );
      
      await Promise.all(promises);
      console.log(`[TELEGRAM] ${this.config.telegram.chatIds.length} Telegram mesajı gönderildi`);
      return true;
    } catch (error) {
      console.error('Telegram gönderme hatası:', error);
      return false;
    }
  }

  /**
   * Alarm mesajını formatlı hale getir
   */
  private formatAlertMessage(alert: Alert): string {
    const severityEmoji = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'danger': '🚨'
    }[alert.severity] || '⚠️';

    const timestamp = new Date(alert.timestamp).toLocaleString();
    
    return `${severityEmoji} <b>Network Alert</b>\n\n` +
           `<b>Message:</b> ${alert.message}\n` +
           `<b>Severity:</b> ${alert.severity.toUpperCase()}\n` +
           `<b>Time:</b> ${timestamp}\n` +
           `<b>Status:</b> ${alert.status.toUpperCase()}\n`;
  }
}

// Singleton instance
export const notificationService = NotificationService.getInstance();