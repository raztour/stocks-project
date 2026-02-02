import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { BinanceProvider } from './providers/binance.provider';
import { CoinGeckoProvider } from './providers/coingecko.provider';

@Module({
  providers: [MarketDataService, BinanceProvider, CoinGeckoProvider],
  exports: [MarketDataService],
})
export class MarketDataModule {}
