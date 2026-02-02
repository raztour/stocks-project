'use client';

import { useEffect, useState } from 'react';
import { useCryptoStore } from '@/store/cryptoStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { CryptoGrid } from '@/components/crypto/CryptoGrid';
import { SymbolSubscriber } from '@/components/crypto/SymbolSubscriber';

// Popular crypto symbols to track
const DEFAULT_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'SOLUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'UNIUSDT',
  'LTCUSDT',
];

export default function DashboardPage() {
  const { connectionStatus, connect } = useCryptoStore();
  const [filter, setFilter] = useState<'all' | 'watchlist'>('all');

  // Initialize WebSocket hooks
  useWebSocket();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Crypto Tracker
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time cryptocurrency prices and charts
              </p>
            </div>
            <ConnectionStatus status={connectionStatus} />
          </div>
        </header>

        <SymbolSubscriber symbols={DEFAULT_SYMBOLS} />

        {/* Filter Toggle */}
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show:</span>
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('watchlist')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                filter === 'watchlist'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Watchlist
            </button>
          </div>
        </div>

        <CryptoGrid filter={filter} />
      </div>
    </main>
  );
}
