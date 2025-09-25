import { spawn } from 'child_process';
import type { NotificationOptions } from './types';

export class NotificationService {
  private isMacOS(): boolean {
    return process.platform === 'darwin';
  }

  public async sendNotification(options: NotificationOptions): Promise<void> {
    if (!this.isMacOS()) {
      console.log('⚠️  macOS notifications not supported on this platform, falling back to console');
      this.logNotification(options);
      return;
    }

    try {
      await this.sendMacNotification(options);
      console.log(`📱 Notification sent: ${options.title}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to send macOS notification:', message);
      console.log('📝 Falling back to console notification:');
      this.logNotification(options);
    }
  }

  private sendMacNotification(options: NotificationOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const sound = options.sound || 'Glass';
      const script = `display notification "${options.message}" with title "${options.title}" sound name "${sound}"`;
      
      const osascript = spawn('osascript', ['-e', script]);
      
      let stderr = '';
      
      osascript.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      osascript.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`osascript failed with code ${code}: ${stderr}`));
        }
      });
      
      osascript.on('error', (error) => {
        reject(new Error(`Failed to spawn osascript: ${error.message}`));
      });
    });
  }

  private logNotification(options: NotificationOptions): void {
    console.log('\n' + '='.repeat(60));
    console.log(`🔔 ${options.title}`);
    console.log('-'.repeat(60));
    console.log(options.message);
    console.log('='.repeat(60) + '\n');
  }

  public async sendSellAlert(askRate: number, threshold: number): Promise<void> {
    const notification: NotificationOptions = {
      title: '💰 USD Sell Alert',
      message: `Current ask rate: ${askRate.toFixed(4)} BRL (target: ≥${threshold.toFixed(2)})`,
      sound: 'Glass'
    };

    await this.sendNotification(notification);
  }

  public async sendErrorAlert(error: string): Promise<void> {
    const notification: NotificationOptions = {
      title: '⚠️ Currency Monitor Error',
      message: `Failed to check rates: ${error}`,
      sound: 'Basso'
    };

    await this.sendNotification(notification);
  }

  public async sendStartupNotification(threshold: number): Promise<void> {
    const notification: NotificationOptions = {
      title: '🚀 Currency Monitor Started',
      message: `Monitoring USD-BRL rate. Target: ≥${threshold.toFixed(2)} BRL`,
      sound: 'Hero'
    };

    await this.sendNotification(notification);
  }
}
