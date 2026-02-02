import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { PriceUpdate } from '@crypto-tracker/shared-types';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface BinanceTickerMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Current close price
  p: string; // Price change
  P: string; // Price change percent
  h: string; // High price
  l: string; // Low price
  v: string; // Volume
  q: string; // Quote volume
}

@Injectable()
export class BinanceProvider extends EventEmitter {
  private readonly logger = new Logger(BinanceProvider.name);
  private ws: WebSocket | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private subscriptionTimeout: NodeJS.Timeout | null = null;

  // Circuit breaker state
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private circuitOpenTime: number | null = null;
  private readonly circuitResetTimeout = 60000; // 60 seconds

  // Use combined stream with pre-built URL for better reliability
  private readonly BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60 seconds

  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Check circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      const now = Date.now();
      if (this.circuitOpenTime && now - this.circuitOpenTime > this.circuitResetTimeout) {
        this.logger.log('Circuit breaker transitioning to HALF_OPEN');
        this.circuitState = CircuitState.HALF_OPEN;
      } else {
        this.logger.warn('Circuit breaker is OPEN, skipping connection attempt');
        return;
      }
    }

    this.isConnecting = true;

    try {
      this.logger.log('Connecting to Binance WebSocket...');

      // Build combined stream URL if we have subscribed symbols
      let wsUrl = this.BINANCE_WS_URL;
      if (this.subscribedSymbols.size > 0) {
        const streams = Array.from(this.subscribedSymbols)
          .map(s => `${s.toLowerCase()}@miniTicker`)
          .join('/');
        wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
        this.logger.log(`Using combined stream with ${this.subscribedSymbols.size} symbols`);
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data) => this.handleMessage(data));
      this.ws.on('error', (error) => this.handleError(error));
      this.ws.on('close', () => this.handleClose());
    } catch (error) {
      this.logger.error(`Failed to connect: ${error.message}`);
      this.handleConnectionFailure();
      this.isConnecting = false;
    }
  }

  private handleOpen() {
    this.logger.log('✅ Connected to Binance WebSocket');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.failureCount = 0;

    // Reset circuit breaker on successful connection
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker closing after successful connection');
      this.circuitState = CircuitState.CLOSED;
    }

    // Start heartbeat
    this.startHeartbeat();

    // Re-subscribe to all symbols
    this.resubscribeAll();
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const message = JSON.parse(data.toString());

      // Debug: Log messages (remove after debugging)
      this['_messageCount'] = (this['_messageCount'] || 0) + 1;
      if (this['_messageCount'] <= 5) {
        this.logger.debug(`Binance message #${this['_messageCount']}: ${JSON.stringify(message).substring(0, 200)}`);
      }

      // Handle pong response
      if (message.result === null || message.result !== undefined) {
        this.resetHeartbeatTimeout();
        return;
      }

      // Handle stream data wrapper
      if (message.stream && message.data) {
        const ticker = message.data;
        if (ticker.e === '24hrMiniTicker') {
          const priceUpdate: PriceUpdate = {
            symbol: ticker.s,
            price: parseFloat(ticker.c),
            priceChange: parseFloat(ticker.p),
            priceChangePercent: parseFloat(ticker.P),
            high24h: parseFloat(ticker.h),
            low24h: parseFloat(ticker.l),
            volume24h: parseFloat(ticker.v),
            lastUpdateTime: ticker.E,
          };

          this.emit('priceUpdate', priceUpdate);
        }
      }
      // Handle direct ticker updates (old format)
      else if (message.e === '24hrMiniTicker') {
        const ticker = message as BinanceTickerMessage;
        const priceUpdate: PriceUpdate = {
          symbol: ticker.s,
          price: parseFloat(ticker.c),
          priceChange: parseFloat(ticker.p),
          priceChangePercent: parseFloat(ticker.P),
          high24h: parseFloat(ticker.h),
          low24h: parseFloat(ticker.l),
          volume24h: parseFloat(ticker.v),
          lastUpdateTime: ticker.E,
        };

        this.emit('priceUpdate', priceUpdate);
      }
    } catch (error) {
      this.logger.error(`Error parsing message: ${error.message}`);
    }
  }

  private handleError(error: Error) {
    this.logger.error(`WebSocket error: ${error.message}`);
    this.handleConnectionFailure();
  }

  private handleClose() {
    this.logger.warn('WebSocket connection closed');
    this.isConnecting = false;
    this.stopHeartbeat();
    this.scheduleReconnect();
  }

  private handleConnectionFailure() {
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.logger.error(
        `Failure threshold reached (${this.failureCount}/${this.failureThreshold})`
      );
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenTime = Date.now();
      this.logger.warn('Circuit breaker opened');
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenTime = Date.now();
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    this.logger.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
        this.logger.debug('Sent ping to Binance');

        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          this.logger.warn('Heartbeat timeout - no pong received');
          this.ws?.terminate();
        }, this.HEARTBEAT_TIMEOUT);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  async subscribe(symbol: string): Promise<void> {
    const normalizedSymbol = symbol.toUpperCase();
    this.subscribedSymbols.add(normalizedSymbol);
    this.logger.log(`Subscribed to ${normalizedSymbol}`);

    // Batch subscriptions - wait 500ms for more to come in
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
    }

    this.subscriptionTimeout = setTimeout(async () => {
      this.subscriptionTimeout = null;
      // Now connect with all symbols
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.connect();
      }
    }, 500);
  }

  async unsubscribe(symbol: string): Promise<void> {
    const normalizedSymbol = symbol.toUpperCase();
    this.subscribedSymbols.delete(normalizedSymbol);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const stream = `${normalizedSymbol.toLowerCase()}@miniTicker`;
      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: Date.now(),
      };

      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.logger.log(`Unsubscribed from ${normalizedSymbol}`);
    }
  }

  private async resubscribeAll() {
    if (this.subscribedSymbols.size > 0) {
      this.logger.log(`Re-subscribing to ${this.subscribedSymbols.size} symbols`);
      // Close existing connection
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      // Reconnect with all symbols
      await this.connect();
    }
  }

  async getPrice(symbol: string): Promise<PriceUpdate | null> {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        lastUpdateTime: data.closeTime,
      };
    } catch (error) {
      this.logger.error(`Error fetching price for ${symbol}: ${error.message}`);
      return null;
    }
  }

  disconnect() {
    this.logger.log('Disconnecting from Binance WebSocket');
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
