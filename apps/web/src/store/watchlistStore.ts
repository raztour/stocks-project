import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WatchlistItem } from '@crypto-tracker/shared-types';

interface WatchlistState {
  items: WatchlistItem[];

  // Actions
  addItem: (symbol: string, notes?: string) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<WatchlistItem>) => void;
  isInWatchlist: (symbol: string) => boolean;
  toggleWatchlist: (symbol: string) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (symbol, notes) => {
        const { isInWatchlist } = get();
        if (isInWatchlist(symbol)) return;

        const newItem: WatchlistItem = {
          id: crypto.randomUUID(),
          symbol: symbol.toUpperCase(),
          addedAt: Date.now(),
          notes,
        };

        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        }));
      },

      isInWatchlist: (symbol) => {
        const { items } = get();
        return items.some((item) => item.symbol === symbol.toUpperCase());
      },

      toggleWatchlist: (symbol) => {
        const { items, addItem, removeItem } = get();
        const item = items.find((i) => i.symbol === symbol.toUpperCase());

        if (item) {
          removeItem(item.id);
        } else {
          addItem(symbol);
        }
      },
    }),
    {
      name: 'crypto-watchlist-storage',
    }
  )
);
