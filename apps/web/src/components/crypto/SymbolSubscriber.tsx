'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SymbolSubscriberProps {
  symbols: string[];
}

export function SymbolSubscriber({ symbols }: SymbolSubscriberProps) {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (symbols.length > 0) {
      subscribe(symbols);
    }

    return () => {
      if (symbols.length > 0) {
        unsubscribe(symbols);
      }
    };
  }, [symbols, subscribe, unsubscribe]);

  return null;
}
