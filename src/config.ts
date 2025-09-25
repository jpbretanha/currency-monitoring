import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AppConfig } from './types';

const CONFIG_FILE = join(process.cwd(), 'config.json');

export class ConfigManager {
  private config: AppConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (existsSync(CONFIG_FILE)) {
        const data = readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(data);
        console.log(`📖 Loaded saved threshold: ${this.config?.threshold} BRL`);
      }
    } catch (error) {
      console.error('❌ Failed to load config:', error);
      this.config = null;
    }
  }

  public getConfig(): AppConfig | null {
    return this.config;
  }

  public getThreshold(): number | null {
    return this.config?.threshold ?? null;
  }

  public setThreshold(threshold: number): void {
    const now = new Date().toISOString();
    
    if (this.config) {
      this.config.threshold = threshold;
    } else {
      this.config = {
        threshold,
        created: now
      };
    }

    this.saveConfig();
    console.log(`✅ Threshold set to ${threshold.toFixed(2)} BRL per USD`);
  }

  public updateLastNotification(): void {
    if (this.config) {
      this.config.lastNotification = new Date().toISOString();
      this.saveConfig();
    }
  }

  public updateLastCheck(): void {
    if (this.config) {
      this.config.lastCheck = new Date().toISOString();
      this.saveConfig();
    }
  }

  public shouldNotify(): boolean {
    if (!this.config?.lastNotification) {
      return true;
    }

    // Only notify if last notification was more than 2 hours ago (since we check every 30min now)
    const lastNotification = new Date(this.config.lastNotification);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    return lastNotification < twoHoursAgo;
  }

  private saveConfig(): void {
    try {
      writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('❌ Failed to save config:', error);
    }
  }

  public getNextCheckTime(): string {
    const now = new Date();
    const next30Min = new Date(now);
    
    // Calculate next 30-minute interval
    const currentMinutes = now.getMinutes();
    const nextInterval = currentMinutes < 30 ? 30 : 60;
    
    if (nextInterval === 30) {
      next30Min.setMinutes(30, 0, 0);
    } else {
      next30Min.setHours(next30Min.getHours() + 1, 0, 0, 0);
    }
    
    return next30Min.toLocaleString();
  }
}
