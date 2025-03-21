import { spawn } from 'child_process';
import { ICMPConfig } from '@shared/schema';

export class ICMPService {
  /**
   * Ping a host using the system's ping command
   */
  static async ping(host: string, config: ICMPConfig): Promise<{ success: boolean; rtt?: number; details?: any }> {
    return new Promise((resolve) => {
      // Default config values
      const timeout = config.timeout || 5;
      const count = config.count || 3;
      const size = config.packet_size || 56;
      
      // Gerçek ping işlemi yapacağız, eğer hata olursa basit bir hata yanıtı döndüreceğiz
      const handlePingError = (error: any) => {
        console.error(`[ICMP] Error pinging ${host}: ${error}`);
        return {
          success: false,
          details: { 
            error: error instanceof Error ? error.message : 'Ping failed',
            host
          }
        };
      };
      
      // Build platform-specific ping command args
      const isWindows = process.platform === 'win32';
      let args: string[] = [];
      
      if (isWindows) {
        args = [
          '-n', String(count),
          '-w', String(timeout * 1000),
          '-l', String(size),
          host
        ];
      } else {
        args = [
          '-c', String(count),
          '-W', String(timeout),
          '-s', String(size),
          host
        ];
      }
      
      let stdout = '';
      let stderr = '';
      
      try {
        const ping = spawn('ping', args);
        
        ping.on('error', (err) => {
          // Handle case where ping command is not available (ENOENT)
          if (err && (err as any).code === 'ENOENT') {
            console.warn(`[ICMP] 'ping' command not found for ${host}`);
            resolve(handlePingError(`Ping command not available: ${err.message}`));
          } else {
            resolve({
              success: false,
              details: { error: `Ping command error: ${err.message}` }
            });
          }
        });
        
        ping.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        ping.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        ping.on('close', (code) => {
          if (code !== 0) {
            return resolve({
              success: false,
              details: { error: stderr || 'Ping failed', stdout, code }
            });
          }
          
          // Parse the result
          const rtt = ICMPService.parseRTT(stdout, isWindows);
          
          return resolve({
            success: true,
            rtt,
            details: { stdout }
          });
        });
        
        // Handle timeout
        setTimeout(() => {
          try {
            ping.kill();
            resolve({
              success: false,
              details: { error: 'Ping timed out', stdout, stderr }
            });
          } catch (err) {
            // Process might have already exited
          }
        }, (timeout + 1) * 1000);
      } catch (error) {
        console.error(`[ICMP] Error executing ping: ${error}`);
        // Return error instead of simulating
        resolve(handlePingError(error));
      }
    });
  }
  
  /**
   * Parse ping output to get round-trip time
   */
  private static parseRTT(stdout: string, isWindows: boolean): number | undefined {
    try {
      if (isWindows) {
        // Parse Windows ping output
        const match = stdout.match(/Average = (\d+)ms/);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      } else {
        // Parse Linux/Mac ping output
        const match = stdout.match(/min\/avg\/max\/mdev = [\d.]+\/([\d.]+)\/[\d.]+\/[\d.]+/);
        if (match && match[1]) {
          return Math.round(parseFloat(match[1]));
        }
      }
      return undefined;
    } catch (error) {
      console.error('Failed to parse ping RTT:', error);
      return undefined;
    }
  }
  
  /**
   * Handle ping errors
   */
  private static handlePingError(error: any): { success: boolean; rtt?: number; details?: any } {
    console.error('[ICMP] Ping error:', error);
    return {
      success: false,
      details: {
        error: 'Ping işlemi başarısız oldu',
        message: error.message || 'Bilinmeyen hata'
      }
    };
  }
}
