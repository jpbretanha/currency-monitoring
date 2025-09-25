import type { AwesomeAPIResponse, CurrencyRate } from './types';

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

export class CurrencyService {
  private async fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return response;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️  Attempt ${i + 1}/${retries} failed:`, message);
        
        if (i === retries - 1) {
          throw error;
        }

        // Exponential backoff: wait 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('All retry attempts failed');
  }

  public async getCurrentRate(): Promise<CurrencyRate> {
    try {
      console.log('📡 Fetching current USD-BRL rate...');
      
      const response = await this.fetchWithRetry(AWESOME_API_URL);
      const data: AwesomeAPIResponse = await response.json();

      if (!data.USDBRL) {
        throw new Error('Invalid response format: missing USDBRL data');
      }

      const usdBrl = data.USDBRL;
      
      const rate: CurrencyRate = {
        ask: parseFloat(usdBrl.ask),
        bid: parseFloat(usdBrl.bid),
        high: parseFloat(usdBrl.high),
        low: parseFloat(usdBrl.low),
        timestamp: parseInt(usdBrl.timestamp) * 1000, // Convert to milliseconds
        name: usdBrl.name,
      };

      // Validate parsed numbers
      if (isNaN(rate.ask) || isNaN(rate.bid)) {
        throw new Error('Invalid rate data: ask or bid prices are not valid numbers');
      }

      console.log(`📊 Current USD ask rate: ${rate.ask.toFixed(4)} BRL`);
      return rate;

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to fetch currency rate:', message);
      throw new Error(`Unable to fetch current exchange rate: ${message}`);
    }
  }

  public formatRate(rate: number): string {
    return rate.toFixed(4);
  }

  public isRateAboveThreshold(askRate: number, threshold: number): boolean {
    return askRate >= threshold;
  }

  public getMarketStatus(askRate: number, threshold: number): {
    aboveTarget: boolean;
    message: string;
    emoji: string;
  } {
    const aboveTarget = this.isRateAboveThreshold(askRate, threshold);
    
    if (aboveTarget) {
      return {
        aboveTarget: true,
        message: `Great time to sell USD! Rate: ${this.formatRate(askRate)} BRL (target: ≥${this.formatRate(threshold)})`,
        emoji: '🎯'
      };
    } else {
      const diff = threshold - askRate;
      return {
        aboveTarget: false,
        message: `Rate below target. Need ${this.formatRate(diff)} more BRL to reach ${this.formatRate(threshold)}`,
        emoji: '📉'
      };
    }
  }
}
