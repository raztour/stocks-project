import { useEffect, useCallback } from 'react';
import { wsClient } from '@/lib/websocket-client';
import { useCryptoStore } from '@/store/cryptoStore';
import { WS_EVENT, PriceUpdate, BatchPriceUpdate } from '@crypto-tracker/shared-types';

export function useWebSocket() {
  const { setConnectionStatus, updatePrice, batchUpdatePrices } = useCryptoStore();

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const handlePriceUpdate = (update: PriceUpdate) => {
      updatePrice(update);
    };

    const handleBatchUpdate = (batch: BatchPriceUpdate) => {
      batchUpdatePrices(batch.updates);
    };

    // Register event listeners
    wsClient.on('connect', handleConnect);
    wsClient.on('disconnect', handleDisconnect);
    wsClient.on('reconnect_attempt', handleReconnectAttempt);
    wsClient.on(WS_EVENT.PRICE_UPDATE, handlePriceUpdate);
    wsClient.on(WS_EVENT.BATCH_UPDATE, handleBatchUpdate);

    // Cleanup
    return () => {
      wsClient.off('connect', handleConnect);
      wsClient.off('disconnect', handleDisconnect);
      wsClient.off('reconnect_attempt', handleReconnectAttempt);
      wsClient.off(WS_EVENT.PRICE_UPDATE, handlePriceUpdate);
      wsClient.off(WS_EVENT.BATCH_UPDATE, handleBatchUpdate);
    };
  }, [setConnectionStatus, updatePrice, batchUpdatePrices]);

  const subscribe = useCallback(async (symbols: string[]) => {
    try {
      await wsClient.subscribe(symbols);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  }, []);

  const unsubscribe = useCallback(async (symbols: string[]) => {
    try {
      await wsClient.unsubscribe(symbols);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }, []);

  return { subscribe, unsubscribe };
}
