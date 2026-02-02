import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { PriceUpdate } from '@crypto-tracker/shared-types';

@Injectable()
export class CoinGeckoProvider extends EventEmitter {
  private readonly logger = new Logger(CoinGeckoProvider.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 10000; // 10 seconds (fallback mode)
  private trackedSymbols: Set<string> = new Set();

  constructor() {
    super();
  }

  async startPolling() {
    if (this.pollingInterval) return;

    this.logger.log('Starting CoinGecko polling (fallback mode)');
    this.pollingInterval = setInterval(() => {
      this.pollPrices();
    }, this.POLLING_INTERVAL);
  }

  async pollPrices() {
    if (this.trackedSymbols.size === 0) return;

    try {
      // This is a simplified fallback - in production, you'd use CoinGecko API
      this.logger.debug(`Polling ${this.trackedSymbols.size} symbols from CoinGecko`);

      // Note: CoinGecko has rate limits on free tier
      // For production, implement proper rate limiting and batching
    } catch (error) {
      this.logger.error(`Error polling CoinGecko: ${error.message}`);
    }
  }

  async subscribe(symbol: string): Promise<void> {
    this.trackedSymbols.add(symbol);
    if (!this.pollingInterval) {
      this.startPolling();
    }
  }

  async unsubscribe(symbol: string): Promise<void> {
    this.trackedSymbols.delete(symbol);
    if (this.trackedSymbols.size === 0 && this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
