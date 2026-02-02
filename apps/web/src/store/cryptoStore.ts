import { create } from 'zustand';
import { PriceUpdate, ConnectionStatus } from '@crypto-tracker/shared-types';
import { wsClient } from '@/lib/websocket-client';

interface CryptoState {
  prices: Map<string, PriceUpdate>;
  lastUpdateTime: number;
  connectionStatus: ConnectionStatus;
  subscribedSymbols: Set<string>;

  // Actions
  updatePrice: (update: PriceUpdate) => void;
  batchUpdatePrices: (updates: PriceUpdate[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToSymbols: (symbols: string[]) => Promise<void>;
  unsubscribeFromSymbols: (symbols: string[]) => Promise<void>;
  getPrice: (symbol: string) => PriceUpdate | undefined;
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  prices: new Map(),
  lastUpdateTime: Date.now(),
  connectionStatus: 'disconnected',
  subscribedSymbols: new Set(),

  updatePrice: (update: PriceUpdate) => {
    set((state) => {
      const newPrices = new Map(state.prices);
      newPrices.set(update.symbol, update);
      return {
        prices: newPrices,
        lastUpdateTime: Date.now(),
      };
    });
  },

  batchUpdatePrices: (updates: PriceUpdate[]) => {
    set((state) => {
      const newPrices = new Map(state.prices);
      updates.forEach((update) => {
        newPrices.set(update.symbol, update);
      });
      return {
        prices: newPrices,
        lastUpdateTime: Date.now(),
      };
    });
  },

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  connect: async () => {
    try {
      await wsClient.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      set({ connectionStatus: 'disconnected' });
    }
  },

  disconnect: () => {
    wsClient.disconnect();
    set({ connectionStatus: 'disconnected' });
  },

  subscribeToSymbols: async (symbols: string[]) => {
    try {
      await wsClient.subscribe(symbols);
      set((state) => ({
        subscribedSymbols: new Set([...state.subscribedSymbols, ...symbols]),
      }));
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  },

  unsubscribeFromSymbols: async (symbols: string[]) => {
    try {
      await wsClient.unsubscribe(symbols);
      set((state) => {
        const newSubscribed = new Set(state.subscribedSymbols);
        symbols.forEach((s) => newSubscribed.delete(s));
        return { subscribedSymbols: newSubscribed };
      });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  },

  getPrice: (symbol: string) => {
    return get().prices.get(symbol);
  },
}));
