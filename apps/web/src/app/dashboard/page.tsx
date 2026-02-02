'use client';

import { useEffect } from 'react';
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

        <CryptoGrid />
      </div>
    </main>
  );
}
