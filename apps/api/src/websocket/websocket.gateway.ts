import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  WS_EVENT,
  SubscribeRequest,
  UnsubscribeRequest,
  ConnectionStatusMessage,
  BatchPriceUpdate,
  PriceUpdate,
} from '@crypto-tracker/shared-types';
import { MarketDataService } from '../market-data/market-data.service';
import { CacheService } from '../cache/cache.service';

@WSGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private clientSubscriptions: Map<string, Set<string>> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly cacheService: CacheService
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');

    // Listen to market data batch updates
    this.marketDataService.on('batchUpdate', (batch: BatchPriceUpdate) => {
      this.handleBatchUpdate(batch);
    });

    // Subscribe to Redis pub/sub for multi-instance sync
    this.cacheService.subscribe('price:batch', (batch: BatchPriceUpdate) => {
      this.handleBatchUpdate(batch);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Send connection status
    const statusMessage: ConnectionStatusMessage = {
      status: 'connected',
      message: 'Connected to crypto tracker',
      timestamp: Date.now(),
    };

    client.emit(WS_EVENT.CONNECTION_STATUS, statusMessage);

    // Start heartbeat for this client
    this.startHeartbeat(client);

    // Track client subscriptions
    this.clientSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Stop heartbeat
    this.stopHeartbeat(client.id);

    // Clean up subscriptions
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.forEach((symbol) => {
        this.leaveRoom(client, symbol);
      });
      this.clientSubscriptions.delete(client.id);
    }
  }

  @SubscribeMessage(WS_EVENT.SUBSCRIBE)
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeRequest
  ) {
    this.logger.log(`Client ${client.id} subscribing to: ${data.symbols.join(', ')}`);

    const clientSubs = this.clientSubscriptions.get(client.id) || new Set();

    for (const symbol of data.symbols) {
      const normalizedSymbol = symbol.toUpperCase();

      // Add to client's subscriptions
      clientSubs.add(normalizedSymbol);

      // Join room for this symbol
      this.joinRoom(client, normalizedSymbol);

      // Subscribe to market data provider
      await this.marketDataService.subscribeToSymbol(normalizedSymbol);

      // Send current price immediately
      const currentPrice = await this.marketDataService.getPrice(normalizedSymbol);
      if (currentPrice) {
        client.emit(WS_EVENT.PRICE_UPDATE, currentPrice);
      }
    }

    this.clientSubscriptions.set(client.id, clientSubs);

    return { success: true, subscribed: data.symbols };
  }

  @SubscribeMessage(WS_EVENT.UNSUBSCRIBE)
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UnsubscribeRequest
  ) {
    this.logger.log(`Client ${client.id} unsubscribing from: ${data.symbols.join(', ')}`);

    const clientSubs = this.clientSubscriptions.get(client.id);
    if (!clientSubs) return { success: false };

    for (const symbol of data.symbols) {
      const normalizedSymbol = symbol.toUpperCase();

      // Remove from client's subscriptions
      clientSubs.delete(normalizedSymbol);

      // Leave room
      this.leaveRoom(client, normalizedSymbol);

      // Check if any other clients are subscribed to this symbol
      const hasOtherSubscribers = this.hasOtherSubscribers(normalizedSymbol);
      if (!hasOtherSubscribers) {
        // No other clients subscribed, unsubscribe from provider
        await this.marketDataService.unsubscribeFromSymbol(normalizedSymbol);
      }
    }

    return { success: true, unsubscribed: data.symbols };
  }

  @SubscribeMessage(WS_EVENT.PING)
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit(WS_EVENT.PONG, { timestamp: Date.now() });
  }

  private handleBatchUpdate(batch: BatchPriceUpdate) {
    // Broadcast updates to relevant rooms
    batch.updates.forEach((update: PriceUpdate) => {
      const room = this.getRoomName(update.symbol);
      this.server.to(room).emit(WS_EVENT.PRICE_UPDATE, update);
    });

    // Also broadcast the entire batch to global room
    this.server.to('market:global').emit(WS_EVENT.BATCH_UPDATE, batch);
  }

  private joinRoom(client: Socket, symbol: string) {
    const room = this.getRoomName(symbol);
    client.join(room);
    client.join('market:global'); // All clients join global room
    this.logger.debug(`Client ${client.id} joined room: ${room}`);
  }

  private leaveRoom(client: Socket, symbol: string) {
    const room = this.getRoomName(symbol);
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room: ${room}`);
  }

  private getRoomName(symbol: string): string {
    return `market:${symbol.toUpperCase()}`;
  }

  private hasOtherSubscribers(symbol: string): boolean {
    const normalizedSymbol = symbol.toUpperCase();
    for (const [clientId, subs] of this.clientSubscriptions.entries()) {
      if (subs.has(normalizedSymbol)) {
        return true;
      }
    }
    return false;
  }

  private startHeartbeat(client: Socket) {
    const interval = setInterval(() => {
      if (client.connected) {
        client.emit(WS_EVENT.PING);
      } else {
        this.stopHeartbeat(client.id);
      }
    }, this.HEARTBEAT_INTERVAL);

    this.heartbeatIntervals.set(client.id, interval);
  }

  private stopHeartbeat(clientId: string) {
    const interval = this.heartbeatIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(clientId);
    }
  }
}
