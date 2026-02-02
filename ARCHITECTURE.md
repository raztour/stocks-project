# Crypto Tracker - Architecture Document

## Overview

High-performance real-time cryptocurrency tracker designed to handle 1K-50K concurrent users with real-time WebSocket updates, horizontal scalability, and optimal performance through multi-layer throttling.

## System Architecture

### High-Level Design

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │ WebSocket
       │
┌──────▼──────────┐
│  Load Balancer  │
│ (Sticky Session)│
└──────┬──────────┘
       │
   ┌───┴────┬────────┐
   │        │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│API-1│ │API-2│ │API-N│
│     │ │     │ │     │
│NestJS│NestJS│NestJS│
└──┬──┘ └──┬──┘ └──┬──┘
   │       │       │
   └───┬───┴───┬───┘
       │       │
   ┌───▼───────▼───┐
   │  Redis Pub/Sub │
   │  + Cache       │
   └───┬───────┬───┘
       │       │
   ┌───▼───────▼───┐
   │   Binance API  │
   │   WebSocket    │
   └────────────────┘
```

## Core Components

### 1. Frontend (Next.js 14)

#### Technologies
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **WebSocket**: Socket.IO Client
- **Charts**: Lightweight Charts (TradingView)
- **Virtual Scrolling**: @tanstack/react-virtual

#### Key Features

**WebSocket Client (Singleton Pattern)**
- Single global WebSocket instance
- Exponential backoff reconnection (1s → 30s)
- Heartbeat every 30 seconds
- Automatic cleanup on unmount

**State Management (Zustand)**
```typescript
// Crypto Store
- prices: Map<symbol, PriceUpdate>
- connectionStatus: ConnectionStatus
- subscribedSymbols: Set<string>

// Portfolio Store (Persisted)
- holdings: PortfolioHolding[]
- localStorage persistence

// Watchlist Store (Persisted)
- items: WatchlistItem[]
- localStorage persistence
```

**Performance Optimizations**
1. Component-level throttling (100ms = 10 FPS)
2. React.memo on all price components
3. Selective subscriptions (only visible items)
4. Virtual scrolling for 100+ items
5. useCallback/useMemo for memoization

#### File Structure
```
apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── dashboard/
│       └── page.tsx
├── components/
│   ├── ConnectionStatus.tsx
│   └── crypto/
│       ├── CryptoPriceCard.tsx
│       ├── CryptoGrid.tsx
│       └── SymbolSubscriber.tsx
├── hooks/
│   ├── useWebSocket.ts
│   └── useThrottledValue.ts
├── lib/
│   ├── websocket-client.ts
│   └── utils.ts
└── store/
    ├── cryptoStore.ts
    ├── portfolioStore.ts
    └── watchlistStore.ts
```

### 2. Backend (NestJS)

#### Technologies
- **Framework**: NestJS
- **WebSocket**: Socket.IO
- **Cache**: ioredis
- **HTTP Client**: Built-in fetch
- **Exchange**: Binance WebSocket API

#### Modules

**WebSocket Module**
- Gateway for client connections
- Room-based broadcasting
- Subscription management
- Heartbeat (30s ping/pong)

**MarketData Module**
- BinanceProvider: WebSocket client
- CoinGeckoProvider: Fallback polling
- DataAggregator: Batches updates (100ms)
- PriceProcessor: Normalizes data

**Cache Module**
- Redis client for caching (60s TTL)
- Pub/sub for multi-instance sync
- Rate limiting (future)

**Health Module**
- `/health` endpoint
- System metrics

#### Data Processing Pipeline

```
Binance WebSocket
    ↓ (1000+ updates/sec)
Memory Buffer (Map)
    ↓
Batch Processor (every 100ms)
    ↓ (10 batches/sec)
Redis Cache + Pub/Sub
    ↓
WebSocket Rooms
    ↓
Clients
```

**Key Algorithms**

*Circuit Breaker Pattern*
```
States: CLOSED → OPEN → HALF_OPEN → CLOSED
- CLOSED: Normal operation
- OPEN: Failures exceeded threshold (5)
- HALF_OPEN: Test connection after timeout (60s)
- Success in HALF_OPEN → CLOSED
```

*Exponential Backoff*
```
delay = min(baseDelay * 2^(attempts-1), maxDelay)
baseDelay = 1000ms
maxDelay = 30000ms
maxAttempts = 10
```

#### File Structure
```
apps/api/src/
├── main.ts
├── app.module.ts
├── websocket/
│   ├── websocket.module.ts
│   └── websocket.gateway.ts
├── market-data/
│   ├── market-data.module.ts
│   ├── market-data.service.ts
│   └── providers/
│       ├── binance.provider.ts
│       └── coingecko.provider.ts
├── cache/
│   ├── cache.module.ts
│   └── cache.service.ts
└── health/
    ├── health.module.ts
    └── health.controller.ts
```

### 3. Shared Types Package

Common TypeScript interfaces shared between frontend and backend:

```typescript
// WebSocket Protocol
- WS_EVENT enum
- WSMessage<T> interface
- PriceUpdate interface
- BatchPriceUpdate interface
- CandleData interface
- SubscribeRequest/UnsubscribeRequest

// Market Data
- CryptoSymbol interface
- MarketStats interface
- PortfolioHolding interface
- WatchlistItem interface
```

### 4. Infrastructure

#### Redis
- **Purpose**: Cache + Pub/Sub
- **Cache TTL**: 60 seconds for prices
- **Pub/Sub Channels**:
  - `price:batch` - Batch updates
  - `market:{SYMBOL}` - Symbol-specific updates

#### Docker Compose
```yaml
services:
  redis:
    image: redis:7-alpine
    ports: 6379:6379
    volumes: redis-data
```

## Communication Protocols

### WebSocket Message Format

```typescript
interface WSMessage<T> {
  event: WS_EVENT;
  data: T;
  timestamp: number;
  requestId?: string;
}
```

### Message Types

**Client → Server**
```typescript
// Subscribe
{
  event: 'subscribe',
  data: {
    symbols: ['BTCUSDT', 'ETHUSDT']
  }
}

// Unsubscribe
{
  event: 'unsubscribe',
  data: {
    symbols: ['BTCUSDT']
  }
}

// Ping
{ event: 'ping' }
```

**Server → Client**
```typescript
// Price Update
{
  event: 'price_update',
  data: {
    symbol: 'BTCUSDT',
    price: 45000.50,
    priceChangePercent: 2.5,
    high24h: 46000,
    low24h: 44000,
    volume24h: 1000000000,
    lastUpdateTime: 1234567890
  },
  timestamp: 1234567890
}

// Batch Update
{
  event: 'batch_update',
  data: {
    updates: [PriceUpdate, PriceUpdate, ...],
    timestamp: 1234567890
  }
}

// Connection Status
{
  event: 'connection_status',
  data: {
    status: 'connected',
    message: 'Connected to crypto tracker',
    timestamp: 1234567890
  }
}
```

### Room Strategy

Clients are organized into rooms for efficient broadcasting:

- `market:global` - All connected clients
- `market:BTCUSDT` - Clients subscribed to BTC
- `market:ETHUSDT` - Clients subscribed to ETH
- `candles:BTCUSDT:1m` - Clients subscribed to BTC 1-minute candles

**Benefits**:
- Efficient targeting (only send data to interested clients)
- Reduced bandwidth
- Better scalability

## Performance Strategy

### Multi-Layer Throttling

```
Layer 1: Exchange (1000+ updates/sec)
    ↓
Layer 2: Backend Batching (100ms interval)
    ↓ 10 batches/sec
Layer 3: Frontend Store (No throttling)
    ↓
Layer 4: Component Rendering (100ms throttle)
    ↓ 10 FPS
Layer 5: React Optimization (memo + virtual scroll)
    ↓
Result: Smooth 60 FPS UI
```

### Performance Targets

**Backend**
- Latency: < 50ms from exchange to client
- Throughput: 1000+ price updates/sec processed
- Connections: 10K concurrent per instance
- Memory: < 4GB per instance

**Frontend**
- FPS: 60 FPS during updates
- Time to Interactive: < 2s on 4G
- Bundle Size: < 500KB gzipped
- Memory: < 100MB after 1 hour

### Memory Leak Prevention

**Frontend**
- Singleton WebSocket pattern
- Cleanup functions in useEffect
- Unsubscribe from unused channels
- WeakMap for temporary caches

**Backend**
- Clear intervals on destroy
- Remove event listeners
- Close WebSocket connections
- Clear Redis cache on shutdown

## Scalability

### Single Instance (1K-5K users)

```
[Load Balancer]
      ↓
[NestJS + Redis]
      ↓
[1K-5K Clients]
```

**Resources**: 2 vCPU, 4GB RAM

### Multi-Instance (5K-50K users)

```
      [Load Balancer]
     /       |       \
[API-1]  [API-2]  [API-3]
     \       |       /
    [Redis Cluster]
     /       |       \
[Clients] [Clients] [Clients]
```

**Resources**:
- 5 NestJS instances: 10 vCPU, 20GB RAM
- Redis cluster: 6 vCPU, 24GB RAM
- Estimated cost: $500-800/month

### Scaling Considerations

1. **Load Balancing**: Use sticky sessions for WebSocket
2. **Redis Pub/Sub**: Required for multi-instance sync
3. **Monitoring**: Prometheus + Grafana
4. **Auto-scaling**: Based on CPU/memory/connections

## Error Handling & Resilience

### Circuit Breaker (Backend)

```typescript
enum CircuitState {
  CLOSED,   // Normal operation
  OPEN,     // Too many failures
  HALF_OPEN // Testing recovery
}

Thresholds:
- Failure count: 5
- Reset timeout: 60 seconds
- Max reconnect attempts: 10
```

### Reconnection Logic

**Backend → Exchange**
- Circuit breaker pattern
- Exponential backoff
- Automatic resubscription
- Fallback to CoinGecko

**Frontend → Backend**
- Exponential backoff
- Visual feedback (status indicator)
- Automatic resubscription
- Graceful degradation

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| WebSocket disconnected | Show cached prices, reconnection banner |
| Extended outage (5+ min) | Offer manual reconnect button |
| Exchange API down | Fall back to CoinGecko polling |
| Redis down | Continue with in-memory cache |

## Security Considerations

### Frontend
- No authentication required (public dashboard)
- LocalStorage for portfolio/watchlist (client-side only)
- CORS enabled for backend domain
- CSP headers configured

### Backend
- CORS restricted to frontend domain
- Rate limiting per IP (future)
- Input validation on all WebSocket messages
- Health check for monitoring

### Data Privacy
- No user data stored on server
- Portfolio/watchlist stored in browser only
- No tracking or analytics
- No cookies required

## Monitoring & Observability

### Metrics

**Backend**
- WebSocket connections count
- Messages per second (in/out)
- Latency percentiles (p50, p95, p99)
- Memory usage
- CPU usage
- Redis operations/sec
- Circuit breaker state changes

**Frontend**
- Page load time
- Time to interactive
- FPS during updates
- Memory usage over time
- WebSocket reconnection count

### Logging

**Levels**
- ERROR: Connection failures, circuit breaker opens
- WARN: Reconnection attempts, high latency
- INFO: Connections, subscriptions, deployment
- DEBUG: Message processing, heartbeats

**Tools**
- Winston (backend logging)
- Sentry (error tracking)
- DataDog (APM)
- Prometheus (metrics)

## Testing Strategy

### Unit Tests
- Zustand store actions
- Utility functions (formatters)
- WebSocket client methods
- Provider logic

### Integration Tests
- WebSocket connection flow
- Price update propagation
- Subscription management
- Cache operations

### E2E Tests
- User subscribes to symbols
- Prices update in real-time
- Reconnection works
- Portfolio/watchlist persist

### Load Tests
- 10K concurrent connections
- 1000+ updates/sec throughput
- Memory stability over 1 hour
- Reconnection under load

**Tools**: K6, Artillery, Playwright

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Redis cluster set up
- [ ] SSL certificates installed
- [ ] Load balancer configured (sticky sessions)
- [ ] Monitoring dashboards created
- [ ] Error tracking enabled (Sentry)
- [ ] Backups configured (Redis)
- [ ] Auto-scaling policies set
- [ ] Health checks configured
- [ ] Logs aggregation set up

### CI/CD Pipeline

```yaml
Build → Test → Docker Build → Deploy → Smoke Test
```

1. Run unit tests
2. Run integration tests
3. Build Docker images
4. Deploy to staging
5. Run E2E tests
6. Deploy to production
7. Monitor metrics

## Future Enhancements

### Phase 2 Features
- [ ] Historical charts with candle data
- [ ] User authentication (optional)
- [ ] Advanced portfolio analytics
- [ ] Price alerts and notifications
- [ ] Mobile app (React Native)
- [ ] More exchange integrations

### Performance Improvements
- [ ] WebAssembly for chart rendering
- [ ] Service Worker for offline support
- [ ] HTTP/3 for WebSocket
- [ ] GraphQL for REST APIs
- [ ] CDN for static assets

### Scalability Enhancements
- [ ] Kubernetes deployment
- [ ] Multi-region support
- [ ] Edge computing (Cloudflare Workers)
- [ ] Database for historical data
- [ ] Machine learning price predictions

## Conclusion

This architecture provides a solid foundation for a high-performance, scalable cryptocurrency tracker. The multi-layer throttling strategy ensures smooth UI performance, while the circuit breaker pattern and Redis pub/sub enable resilient, horizontally scalable backend services.

Key architectural decisions:
1. **Monorepo**: Simplifies development and deployment
2. **WebSocket**: Real-time updates with minimal latency
3. **Batching**: Reduces message frequency without sacrificing data freshness
4. **Circuit Breaker**: Prevents cascade failures
5. **Redis Pub/Sub**: Enables stateless, horizontally scalable backend
6. **Throttling**: Maintains 60 FPS UI despite 1000+ updates/sec
7. **LocalStorage**: Simple persistence without backend auth

The system is designed to handle 1K-50K concurrent users with room for growth through horizontal scaling.
