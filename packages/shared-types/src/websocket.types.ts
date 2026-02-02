/**
 * WebSocket Event Types
 */
export enum WS_EVENT {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',

  // Client -> Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PING = 'ping',

  // Server -> Client
  PONG = 'pong',
  PRICE_UPDATE = 'price_update',
  BATCH_UPDATE = 'batch_update',
  CANDLE_UPDATE = 'candle_update',
  CONNECTION_STATUS = 'connection_status',
}

/**
 * Connection Status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Base WebSocket Message
 */
export interface WSMessage<T = any> {
  event: WS_EVENT;
  data: T;
  timestamp: number;
  requestId?: string;
}

/**
 * Price Update Data
 */
export interface PriceUpdate {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdateTime: number;
}

/**
 * Batch Price Update
 */
export interface BatchPriceUpdate {
  updates: PriceUpdate[];
  timestamp: number;
}

/**
 * Candle Data (OHLCV)
 */
export interface CandleData {
  symbol: string;
  interval: CandleInterval;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Candle Interval
 */
export enum CandleInterval {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
}

/**
 * Subscribe Request
 */
export interface SubscribeRequest {
  symbols: string[];
  channels?: SubscriptionChannel[];
}

/**
 * Unsubscribe Request
 */
export interface UnsubscribeRequest {
  symbols: string[];
  channels?: SubscriptionChannel[];
}

/**
 * Subscription Channel Types
 */
export enum SubscriptionChannel {
  PRICE = 'price',
  CANDLES = 'candles',
}

/**
 * Subscription Info
 */
export interface SubscriptionInfo {
  symbol: string;
  channel: SubscriptionChannel;
  interval?: CandleInterval;
}

/**
 * Connection Status Message
 */
export interface ConnectionStatusMessage {
  status: ConnectionStatus;
  message?: string;
  timestamp: number;
}
