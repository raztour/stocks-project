import { Module } from '@nestjs/common';
import { WebSocketModule } from './websocket/websocket.module';
import { MarketDataModule } from './market-data/market-data.module';
import { CacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [WebSocketModule, MarketDataModule, CacheModule, HealthModule],
})
export class AppModule {}
