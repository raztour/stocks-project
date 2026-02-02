/**
 * Cryptocurrency Symbol
 */
export interface CryptoSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  name: string;
  logo?: string;
}

/**
 * Market Statistics
 */
export interface MarketStats {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  volumeQuote24h: number;
  marketCap?: number;
  rank?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  lastUpdateTime: number;
}

/**
 * Portfolio Holding
 */
export interface PortfolioHolding {
  id: string;
  symbol: string;
  amount: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  addedAt: number;
  lastUpdated: number;
}

/**
 * Watchlist Item
 */
export interface WatchlistItem {
  id: string;
  symbol: string;
  addedAt: number;
  notes?: string;
}

/**
 * Exchange Provider
 */
export enum ExchangeProvider {
  BINANCE = 'binance',
  COINGECKO = 'coingecko',
}
