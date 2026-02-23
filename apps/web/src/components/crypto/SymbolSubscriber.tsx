'use client';

import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCryptoStore } from '@/store/cryptoStore';

interface SymbolSubscriberProps {
  symbols: string[];
}

function diffSymbols(prev: Set<string>, next: string[]): { toAdd: string[]; toRemove: string[] } {
  const nextSet = new Set(next);
  const toAdd = next.filter((s) => !prev.has(s));
  const toRemove = [...prev].filter((s) => !nextSet.has(s));
  return { toAdd, toRemove };
}

export function SymbolSubscriber({ symbols }: SymbolSubscriberProps) {
  const { subscribe, unsubscribe } = useWebSocket();
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  const previousSymbolsRef = useRef<Set<string>>(new Set());
  const subscribedThisRunRef = useRef<string[]>([]);

  useEffect(() => {
    const currentSet = new Set(symbols);

    if (connectionStatus === 'connected') {
      const { toAdd, toRemove } = diffSymbols(previousSymbolsRef.current, symbols);
      if (toRemove.length > 0) unsubscribe(toRemove);
      if (toAdd.length > 0) subscribe(toAdd);
      subscribedThisRunRef.current = toAdd;
      previousSymbolsRef.current = currentSet;
    } else {
      subscribedThisRunRef.current = [];
      previousSymbolsRef.current = new Set(); // reset so reconnect will re-subscribe all
    }

    return () => {
      if (subscribedThisRunRef.current.length > 0) {
        unsubscribe(subscribedThisRunRef.current);
      }
    };
  }, [connectionStatus, symbols, subscribe, unsubscribe]);

  return null;
}
