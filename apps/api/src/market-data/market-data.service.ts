import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BinanceProvider } from './providers/binance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';
import { PriceUpdate, BatchPriceUpdate } from '@crypto-tracker/shared-types';
import { CacheService } from '../cache/cache.service';
import { EventEmitter } from 'events';

@Injectable()
export class MarketDataService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);
  private priceBuffer: Map<string, PriceUpdate> = new Map();
  private batchInterval: NodeJS.Timeout;
  private readonly BATCH_INTERVAL_MS = 100; // Batch every 100ms

  constructor(
    private readonly binanceProvider: BinanceProvider,
    private readonly coinGeckoProvider: CoinGeckoProvider,
    private readonly cacheService: CacheService
  ) {
    super();
  }

  async onModuleInit() {
    this.logger.log('Initializing market data service...');

    // Set up price update listeners from providers
    this.binanceProvider.on('priceUpdate', (update: PriceUpdate) => {
      this.handlePriceUpdate(update);
    });

    this.coinGeckoProvider.on('priceUpdate', (update: PriceUpdate) => {
      this.handlePriceUpdate(update);
    });

    // Start batch processor
    this.startBatchProcessor();

    // Don't connect immediately - wait for subscriptions
    // Connection will be established when first subscription arrives

    this.logger.log('Market data service initialized');
  }

  private handlePriceUpdate(update: PriceUpdate) {
    // Buffer the update
    this.priceBuffer.set(update.symbol, update);

    // Cache in Redis
    this.cacheService.set(`price:${update.symbol}`, update, 60);
  }

  private startBatchProcessor() {
    this.batchInterval = setInterval(() => {
      if (this.priceBuffer.size > 0) {
        const updates = Array.from(this.priceBuffer.values());
        this.priceBuffer.clear();

        const batch: BatchPriceUpdate = {
          updates,
          timestamp: Date.now(),
        };

        // Emit batch update
        this.emit('batchUpdate', batch);

        // Publish to Redis for multi-instance sync
        this.cacheService.publish('price:batch', batch);
      }
    }, this.BATCH_INTERVAL_MS);
  }

  async subscribeToSymbol(symbol: string): Promise<void> {
    this.logger.log(`Subscribing to ${symbol}`);
    await this.binanceProvider.subscribe(symbol);
  }

  async unsubscribeFromSymbol(symbol: string): Promise<void> {
    this.logger.log(`Unsubscribing from ${symbol}`);
    await this.binanceProvider.unsubscribe(symbol);
  }

  async getPrice(symbol: string): Promise<PriceUpdate | null> {
    // Try cache first
    const cached = await this.cacheService.get<PriceUpdate>(`price:${symbol}`);
    if (cached) return cached;

    // Fall back to provider
    return await this.binanceProvider.getPrice(symbol);
  }

  async getPrices(symbols: string[]): Promise<PriceUpdate[]> {
    const prices = await Promise.all(symbols.map((s) => this.getPrice(s)));
    return prices.filter((p) => p !== null) as PriceUpdate[];
  }

  onModuleDestroy() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }
}
