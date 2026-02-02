# Quick Start Guide

Get the Crypto Tracker up and running in 5 minutes.

## Prerequisites

Make sure you have these installed:
- Node.js 18 or higher
- pnpm 8 or higher
- Docker and Docker Compose

Check versions:
```bash
node --version  # Should be v18 or higher
pnpm --version  # Should be 8.x or higher
docker --version
```

## Installation Steps

### 1. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for the monorepo, including both frontend and backend packages.

### 2. Build Shared Types

The shared types package needs to be built first since both apps depend on it:

```bash
pnpm --filter @crypto-tracker/shared-types build
```

### 3. Start Redis

Redis is required for caching and pub/sub:

```bash
docker-compose up -d
```

Verify Redis is running:
```bash
docker-compose ps
```

You should see the `crypto-tracker-redis` container running.

### 4. Start Development Servers

Start both the backend and frontend in development mode:

```bash
pnpm dev
```

This will start:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000

Wait for both servers to start (you'll see "ready" messages in the terminal).

### 5. Open the Application

Open your browser and navigate to:

```
http://localhost:3000
```

You should be redirected to the dashboard at `http://localhost:3000/dashboard` and see:
- Connection status indicator (should show "Connected" with a green dot)
- Real-time cryptocurrency price cards for popular coins (BTC, ETH, etc.)

## Verify Everything Works

### 1. Check Backend Health

Open a new terminal and run:

```bash
curl http://localhost:3001/health
```

You should see a JSON response with status "ok".

### 2. Check WebSocket Connection

In the browser console (F12), you should see:
```
✅ Connected to WebSocket server
Subscribed to: BTCUSDT,ETHUSDT,BNBUSDT,...
```

### 3. Watch Price Updates

The price cards should update in real-time. Watch the prices change - they should update every few seconds as new data comes from Binance.

### 4. Test Watchlist

Click the star icon on any cryptocurrency card to add it to your watchlist. The star should turn yellow. Refresh the page - your watchlist should persist (stored in browser localStorage).

## Common Issues

### Port Already in Use

If you see "port 3000 already in use" or "port 3001 already in use":

```bash
# Kill processes on these ports (macOS/Linux)
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Redis Connection Error

If backend shows "Failed to connect to Redis":

```bash
# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

### No Price Updates

If you don't see prices updating:

1. Check backend logs for Binance WebSocket connection
2. Open browser console and look for WebSocket errors
3. Verify you have an active internet connection

### pnpm Not Found

Install pnpm globally:

```bash
npm install -g pnpm
```

## Development Commands

### Run Individual Apps

```bash
# Backend only
pnpm --filter @crypto-tracker/api dev

# Frontend only
pnpm --filter @crypto-tracker/web dev
```

### Build for Production

```bash
# Build all packages
pnpm build

# Build specific app
pnpm --filter @crypto-tracker/api build
pnpm --filter @crypto-tracker/web build
```

### Clean Build Artifacts

```bash
pnpm clean
```

### Format Code

```bash
pnpm format
```

### Lint

```bash
pnpm lint
```

## Next Steps

Once everything is running:

1. **Explore the Dashboard**: See real-time prices for 12 popular cryptocurrencies
2. **Add to Watchlist**: Click stars to mark favorites
3. **Track Portfolio**: Add holdings to track your crypto investments (coming soon)
4. **View Architecture**: Read `ARCHITECTURE.md` to understand the system design
5. **Customize**: Edit `apps/web/src/app/dashboard/page.tsx` to change which symbols are tracked

## Stop the Application

To stop all services:

```bash
# Stop frontend and backend (Ctrl+C in the terminal running pnpm dev)

# Stop Redis
docker-compose down
```

## What's Next?

- Read the full [README.md](README.md) for detailed documentation
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design details
- Explore the codebase starting with:
  - Frontend: `apps/web/src/app/dashboard/page.tsx`
  - Backend: `apps/api/src/websocket/websocket.gateway.ts`
  - Shared Types: `packages/shared-types/src/websocket.types.ts`

## Need Help?

If you encounter issues not covered here:

1. Check the logs in your terminal
2. Check browser console (F12) for frontend errors
3. Verify all prerequisites are installed correctly
4. Open an issue on GitHub with error details

Happy coding! 🚀
