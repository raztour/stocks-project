'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCryptoStore } from '@/store/cryptoStore';

interface SymbolSubscriberProps {
  symbols: string[];
}

export function SymbolSubscriber({ symbols }: SymbolSubscriberProps) {
  const { subscribe, unsubscribe } = useWebSocket();
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);

  useEffect(() => {
    // Only subscribe when connected
    if (connectionStatus === 'connected' && symbols.length > 0) {
      subscribe(symbols);
    }

    return () => {
      if (symbols.length > 0) {
        unsubscribe(symbols);
      }
    };
  }, [connectionStatus, symbols, subscribe, unsubscribe]);

  return null;
}
