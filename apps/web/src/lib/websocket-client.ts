import { io, Socket } from 'socket.io-client';
import {
  WS_EVENT,
  WSMessage,
  PriceUpdate,
  BatchPriceUpdate,
  ConnectionStatusMessage,
  SubscribeRequest,
  UnsubscribeRequest,
} from '@crypto-tracker/shared-types';

type EventCallback = (data: any) => void;

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  private readonly WS_URL =
    process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.socket = io(this.WS_URL, {
          transports: ['websocket', 'polling'],
          reconnection: false, // We'll handle reconnection manually
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to WebSocket server');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          this.emit('connect', null);
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('WebSocket disconnected:', reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnect', reason);
          this.scheduleReconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        });

        // Listen for server events
        this.socket.on(WS_EVENT.CONNECTION_STATUS, (data: ConnectionStatusMessage) => {
          this.emit(WS_EVENT.CONNECTION_STATUS, data);
        });

        this.socket.on(WS_EVENT.PRICE_UPDATE, (data: PriceUpdate) => {
          this.emit(WS_EVENT.PRICE_UPDATE, data);
        });

        this.socket.on(WS_EVENT.BATCH_UPDATE, (data: BatchPriceUpdate) => {
          this.emit(WS_EVENT.BATCH_UPDATE, data);
        });

        this.socket.on(WS_EVENT.PONG, (data) => {
          // Heartbeat response received
          console.debug('Pong received');
        });
      } catch (error) {
        console.error('Failed to create socket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    console.log('Disconnecting from WebSocket server');
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.eventListeners.clear();
  }

  subscribe(symbols: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected'));
        return;
      }

      const request: SubscribeRequest = {
        symbols,
      };

      this.socket.emit(WS_EVENT.SUBSCRIBE, request, (response: any) => {
        if (response?.success) {
          console.log('Subscribed to:', symbols);
          resolve(response);
        } else {
          console.error('Subscription failed:', response);
          reject(new Error('Subscription failed'));
        }
      });
    });
  }

  unsubscribe(symbols: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected'));
        return;
      }

      const request: UnsubscribeRequest = {
        symbols,
      };

      this.socket.emit(WS_EVENT.UNSUBSCRIBE, request, (response: any) => {
        if (response?.success) {
          console.log('Unsubscribed from:', symbols);
          resolve(response);
        } else {
          console.error('Unsubscription failed:', response);
          reject(new Error('Unsubscription failed'));
        }
      });
    });
  }

  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(WS_EVENT.PING);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed', null);
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.emit('reconnect_attempt', { attempt: this.reconnectAttempts });

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const wsClient = WebSocketClient.getInstance();
