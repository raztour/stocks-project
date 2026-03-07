# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Install dependencies
pnpm install

# Start all apps (frontend + backend)
pnpm dev

# Start individual apps
pnpm --filter @crypto-tracker/api dev
pnpm --filter @crypto-tracker/web dev

# Build shared types first (required before building apps)
pnpm --filter @crypto-tracker/shared-types build

# Build all
pnpm build
```

### Code Quality
```bash
pnpm lint                        # Lint all packages
pnpm --filter @crypto-tracker/api lint
pnpm --filter @crypto-tracker/web lint
pnpm format                      # Prettier on all TS/JS/JSON/MD files
```

### Testing
```bash
pnpm --filter @crypto-tracker/api test
pnpm --filter @crypto-tracker/web test
```

### Infrastructure
```bash
docker-compose up -d   # Start Redis (required for backend)
```

### Environment Setup
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Backend env (`apps/api/.env`): `PORT`, `FRONTEND_URL`, `REDIS_URL`, `NODE_ENV`
Frontend env (`apps/web/.env.local`): `NEXT_PUBLIC_WS_URL`

## Architecture

**Monorepo** managed by Turborepo + pnpm workspaces:
- `apps/api` — NestJS backend (`@crypto-tracker/api`)
- `apps/web` — Next.js 14 frontend (`@crypto-tracker/web`)
- `packages/shared-types` — TypeScript interfaces shared between apps (`@crypto-tracker/shared-types`)

### Data Flow

```
Binance WebSocket (1000+ updates/sec)
  → Backend memory buffer
  → Batch processor (every 100ms)
  → Redis cache + pub/sub
  → Socket.IO rooms (room-per-symbol: market:BTCUSDT)
  → Frontend Zustand store
  → Components throttled to 10 FPS (100ms)
```

### Backend (NestJS)

- **`websocket/websocket.gateway.ts`** — Socket.IO gateway; manages client connections, room subscriptions, and heartbeats. Clients join `market:<SYMBOL>` rooms on subscribe and `market:global` for batch updates.
- **`market-data/`** — `MarketDataService` aggregates updates; `BinanceProvider` connects to Binance WebSocket; `CoinGeckoProvider` is the polling fallback.
- **`cache/cache.service.ts`** — ioredis wrapper for price caching (60s TTL) and pub/sub channel `price:batch` for multi-instance sync.
- **`health/health.controller.ts`** — `GET /health` endpoint.

Circuit breaker pattern on the exchange connection: CLOSED → OPEN (after 5 failures) → HALF_OPEN (after 60s) → CLOSED.

### Frontend (Next.js 14 App Router)

- **`/`** redirects to `/dashboard`.
- **`src/lib/websocket-client.ts`** — Singleton Socket.IO client with exponential backoff reconnection.
- **`src/store/cryptoStore.ts`** — Zustand store wrapping the WS client; holds `prices: Map<symbol, PriceUpdate>`, `connectionStatus`, `subscribedSymbols`.
- **`src/store/portfolioStore.ts`** and **`watchlistStore.ts`** — Zustand stores persisted to localStorage.
- **`src/hooks/useThrottledValue.ts`** — Throttles component re-renders to 100ms (10 FPS).
- **`src/components/crypto/`** — `CryptoGrid`, `CryptoPriceCard`, `SymbolSelector`, `SymbolFilterPanel`, `SymbolSubscriber`.

### Shared Types (`packages/shared-types`)

Defines the WebSocket protocol: `WS_EVENT` enum, `PriceUpdate`, `BatchPriceUpdate`, `CandleData`, `SubscribeRequest`, `UnsubscribeRequest`, `WSMessage<T>`. Must be built before other packages.

### WebSocket Events

Client → Server: `subscribe`, `unsubscribe`, `ping`
Server → Client: `price_update`, `batch_update`, `connection_status`, `pong`
