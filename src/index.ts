import { Elysia } from 'elysia';
import { cron, Patterns } from '@elysiajs/cron';
import { ConfigManager } from './config';
import { CurrencyService } from './currency';
import { NotificationService } from './notifications';
import type { MonitorStatus } from './types';

class CurrencyMonitor {
  private configManager: ConfigManager;
  private currencyService: CurrencyService;
  private notificationService: NotificationService;
  private app: any;

  constructor() {
    this.configManager = new ConfigManager();
    this.currencyService = new CurrencyService();
    this.notificationService = new NotificationService();
    this.app = this.createApp();
  }

  private createApp(): any {
    return new Elysia()
      .use(
        cron({
          name: 'currency-check',
          pattern: '*/30 * * * *', // Every 30 minutes
          run: () => this.checkCurrencyRate()
        })
      )
      .get('/', () => ({
        message: '💰 Currency Monitor API',
        endpoints: {
          '/status': 'Get current status',
          '/check': 'Force currency check',
          '/config': 'Get current configuration'
        }
      }))
      .get('/status', () => this.getStatus())
      .get('/config', () => this.configManager.getConfig())
      .post('/threshold', ({ body }: any) => {
        if (typeof body.threshold !== 'number' || body.threshold <= 0) {
          throw new Error('Invalid threshold: must be a positive number');
        }
        this.configManager.setThreshold(body.threshold);
        return { success: true, threshold: body.threshold };
      })
      .get('/check', async () => {
        try {
          const result = await this.checkCurrencyRate();
          return { success: true, ...result };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return { success: false, error: message };
        }
      })
      .onError(({ error, code }) => {
        if (code === 'NOT_FOUND') {
          return { error: 'Endpoint not found' };
        }
        console.error('❌ Server error:', error);
        return { error: 'Internal server error' };
      });
  }

  private async getStatus(): Promise<MonitorStatus> {
    try {
      const config = this.configManager.getConfig();
      if (!config) {
        throw new Error('No configuration found. Please set a threshold first.');
      }

      const rate = await this.currencyService.getCurrentRate();
      const aboveTarget = this.currencyService.isRateAboveThreshold(rate.ask, config.threshold);

      return {
        currentRate: rate.ask,
        threshold: config.threshold,
        aboveTarget,
        lastCheck: config.lastCheck || 'Never',
        nextCheck: this.configManager.getNextCheckTime()
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to get status: ${message}`);
    }
  }

  private async checkCurrencyRate(): Promise<{ rate: number; threshold: number; triggered: boolean; message: string }> {
    console.log('\n⏰ Running scheduled currency check (every 30 minutes)...');
    
    try {
      const threshold = this.configManager.getThreshold();
      if (!threshold) {
        throw new Error('No threshold configured');
      }

      const rate = await this.currencyService.getCurrentRate();
      this.configManager.updateLastCheck();

      const marketStatus = this.currencyService.getMarketStatus(rate.ask, threshold);
      console.log(`${marketStatus.emoji} ${marketStatus.message}`);

      let triggered = false;

      if (marketStatus.aboveTarget && this.configManager.shouldNotify()) {
        await this.notificationService.sendSellAlert(rate.ask, threshold);
        this.configManager.updateLastNotification();
        triggered = true;
        console.log('🎯 ALERT: Rate above target - Notification sent!');
      } else if (marketStatus.aboveTarget) {
        console.log('🔕 Rate above target but notification cooldown active');
      }

      return {
        rate: rate.ask,
        threshold,
        triggered,
        message: marketStatus.message
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Currency check failed:', message);
      await this.notificationService.sendErrorAlert(message);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    // Handle CLI arguments
    const args = process.argv.slice(2);
    if (args.length > 0) {
      const thresholdArg = parseFloat(args[0]);
      if (isNaN(thresholdArg) || thresholdArg <= 0) {
        console.error('❌ Invalid threshold. Please provide a positive number.');
        console.error('Usage: bun run src/index.ts [threshold]');
        console.error('Example: bun run src/index.ts 5.3');
        process.exit(1);
      }
      this.configManager.setThreshold(thresholdArg);
    }

    // Check if we have a threshold configured
    const threshold = this.configManager.getThreshold();
    if (!threshold) {
      console.error('❌ No threshold configured. Please provide a threshold:');
      console.error('Usage: bun run src/index.ts <threshold>');
      console.error('Example: bun run src/index.ts 5.3');
      process.exit(1);
    }

    // Send startup notification
    await this.notificationService.sendStartupNotification(threshold);

    // Start the server
    this.app.listen(3000);
    console.log('🚀 Server running on http://localhost:3000');

    // Perform initial check
    try {
      const status = await this.getStatus();
      console.log(`📊 Current USD ask rate: ${status.currentRate.toFixed(4)} BRL (${status.aboveTarget ? 'above' : 'below'} target)`);
      console.log(`⏰ Next check: ${status.nextCheck}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Initial status check failed:', message);
    }
  }
}

// Initialize and start the application
const monitor = new CurrencyMonitor();
monitor.initialize().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('💥 Failed to start currency monitor:', message);
  process.exit(1);
});
