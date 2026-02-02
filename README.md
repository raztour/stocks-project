# Crypto Tracker

High-performance, real-time cryptocurrency tracker supporting 1K-50K concurrent users with live prices, interactive charts, portfolio tracking, and watchlists.

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Zustand
- **Backend**: NestJS + WebSockets (Socket.IO)
- **Cache/Pub-Sub**: Redis
- **Data Sources**: Binance WebSocket feeds
- **Monorepo**: Turborepo + pnpm

### Key Features

- Real-time price updates (10 updates/sec to clients)
- WebSocket communication with automatic reconnection
- Circuit breaker pattern for exchange connections
- Room-based broadcasting for efficient targeting
- Redis pub/sub for horizontal scalability
- Multi-layer throttling for optimal performance
- Portfolio tracking (localStorage)
- Watchlist functionality
- Responsive design with dark mode

## Project Structure

```
crypto-tracker/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilities
│   │   │   └── store/         # Zustand stores
│   │   └── package.json
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── websocket/     # WebSocket gateway
│       │   ├── market-data/   # Exchange providers
│       │   ├── cache/         # Redis service
│       │   └── health/        # Health checks
│       └── package.json
│
├── packages/
│   └── shared-types/          # Shared TypeScript interfaces
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for Redis)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crypto-tracker
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.example apps/web/.env.local
```

4. Start Redis:
```bash
docker-compose up -d
```

5. Build shared types:
```bash
pnpm --filter @crypto-tracker/shared-types build
```

### Development

Start all applications in development mode:
```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Redis: localhost:6379

Or run individual apps:
```bash
# Backend only
pnpm --filter @crypto-tracker/api dev

# Frontend only
pnpm --filter @crypto-tracker/web dev
```

### Production Build

```bash
pnpm build
```

## Architecture Details

### Data Flow

```
Binance WebSocket (1000+ updates/sec)
       ↓
Backend Buffer (Map)
       ↓
Batch Processor (every 100ms)
       ↓
Redis Cache + Pub/Sub
       ↓
WebSocket Broadcast (10 updates/sec)
       ↓
Frontend Store (Zustand)
       ↓
Component Rendering (throttled to 10 FPS)
```

### WebSocket Protocol

#### Connection Events
- `CONNECT` - Client connected
- `DISCONNECT` - Client disconnected
- `CONNECTION_STATUS` - Server sends connection status

#### Price Events
- `PRICE_UPDATE` - Single price update
- `BATCH_UPDATE` - Multiple price updates
- `CANDLE_UPDATE` - OHLCV candle data

#### Client Actions
- `SUBSCRIBE` - Subscribe to symbols
- `UNSUBSCRIBE` - Unsubscribe from symbols
- `PING` / `PONG` - Heartbeat

### Performance Optimizations

#### Backend
1. **Batching**: Aggregates 1000+ updates/sec into 10 batches/sec
2. **Circuit Breaker**: Prevents cascade failures on exchange API errors
3. **Room-Based Broadcasting**: Clients only receive data they subscribed to
4. **Redis Pub/Sub**: Enables horizontal scaling across multiple instances

#### Frontend
1. **Component-Level Throttling**: Limits re-renders to 10 FPS (100ms)
2. **React.memo**: Memoizes all price components
3. **Selective Subscriptions**: Only subscribe to visible symbols
4. **Virtual Scrolling**: For lists with 100+ items (to be implemented)
5. **Singleton WebSocket**: Single global connection shared across app

### Reconnection Strategy

#### Backend (to Exchange)
- Circuit breaker with 3 states: CLOSED, OPEN, HALF_OPEN
- Exponential backoff: 1s, 2s, 4s, 8s... up to 30s
- Max 10 reconnection attempts
- Automatic resubscription on reconnect

#### Frontend (to Backend)
- Exponential backoff: 1s, 2s, 4s, 8s... up to 30s
- Max 10 reconnection attempts
- Visual feedback (reconnecting status)
- Automatic resubscription on reconnect

## API Reference

### Health Check

```bash
GET http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "uptime": 123.45,
  "memory": { ... }
}
```

### WebSocket Events

#### Subscribe to Symbols
```typescript
socket.emit('subscribe', {
  symbols: ['BTCUSDT', 'ETHUSDT']
});
```

#### Receive Price Updates
```typescript
socket.on('price_update', (update: PriceUpdate) => {
  console.log(update.symbol, update.price);
});
```

#### Receive Batch Updates
```typescript
socket.on('batch_update', (batch: BatchPriceUpdate) => {
  console.log('Received', batch.updates.length, 'updates');
});
```

## State Management

### Crypto Store (Zustand)
Manages real-time price data and WebSocket connection:
- `prices`: Map of symbol → price data
- `connectionStatus`: 'connected' | 'disconnected' | 'reconnecting'
- `subscribedSymbols`: Set of subscribed symbols

### Portfolio Store (Zustand + Persist)
Manages user portfolio holdings (localStorage):
- `holdings`: Array of portfolio holdings
- `addHolding()`: Add new holding
- `calculateTotalValue()`: Calculate total portfolio value

### Watchlist Store (Zustand + Persist)
Manages user watchlist (localStorage):
- `items`: Array of watchlist items
- `toggleWatchlist()`: Add/remove from watchlist
- `isInWatchlist()`: Check if symbol is in watchlist

## Testing

### Backend Tests
```bash
pnpm --filter @crypto-tracker/api test
```

### Frontend Tests
```bash
pnpm --filter @crypto-tracker/web test
```

### Load Testing
Use K6 or Artillery to simulate concurrent users:
```bash
# Example with K6
k6 run load-test.js
```

## Deployment

### Docker Production Build

```bash
# Build images
docker build -t crypto-tracker-api -f apps/api/Dockerfile .
docker build -t crypto-tracker-web -f apps/web/Dockerfile .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

#### Backend (`apps/api/.env`)
```env
PORT=3001
FRONTEND_URL=https://your-frontend.com
REDIS_URL=redis://redis:6379
NODE_ENV=production
```

#### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_WS_URL=wss://your-api.com
```

## Scaling

### Horizontal Scaling (5K-50K users)

1. Deploy multiple NestJS instances behind a load balancer
2. Enable sticky sessions on load balancer
3. Use Redis cluster for high availability
4. Monitor with Prometheus + Grafana

Architecture:
```
[Load Balancer]
   /    |    \
[API1][API2][API3]
   \    |    /
[Redis Cluster]
```

### Estimated Resources
- **1K-5K users**: 2 vCPU, 4GB RAM (single instance)
- **5K-50K users**: 10 vCPU, 20GB RAM (5 instances)
- **Redis**: 6 vCPU, 24GB RAM (cluster mode)

## Monitoring

### Metrics to Track
- WebSocket connections count
- Messages per second
- Latency (p95, p99)
- Memory usage
- CPU usage
- Redis operations/sec

### Recommended Tools
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Sentry**: Error tracking
- **DataDog**: APM

## Troubleshooting

### WebSocket Connection Fails

1. Check backend is running: `curl http://localhost:3001/health`
2. Check Redis is running: `docker-compose ps`
3. Verify CORS settings in `apps/api/src/main.ts`
4. Check browser console for errors

### No Price Updates

1. Check Binance WebSocket connection in backend logs
2. Verify symbols are valid Binance symbols (e.g., 'BTCUSDT')
3. Check Redis pub/sub is working
4. Verify frontend subscribed to symbols

### High Memory Usage

1. Check for memory leaks with Chrome DevTools
2. Verify WebSocket cleanup in useEffect
3. Monitor price buffer size in backend
4. Check Redis memory usage

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT

## Contact

For questions or support, please open an issue on GitHub.
