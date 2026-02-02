import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [MarketDataModule],
  providers: [WebSocketGateway],
})
export class WebSocketModule {}
