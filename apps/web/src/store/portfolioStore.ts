import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PortfolioHolding } from '@crypto-tracker/shared-types';

interface PortfolioState {
  holdings: PortfolioHolding[];

  // Actions
  addHolding: (holding: Omit<PortfolioHolding, 'id' | 'addedAt' | 'lastUpdated'>) => void;
  removeHolding: (id: string) => void;
  updateHolding: (id: string, updates: Partial<PortfolioHolding>) => void;
  calculateTotalValue: (prices: Map<string, { price: number }>) => number;
  calculateHoldingValue: (holding: PortfolioHolding, currentPrice: number) => PortfolioHolding;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      holdings: [],

      addHolding: (holding) => {
        const newHolding: PortfolioHolding = {
          ...holding,
          id: crypto.randomUUID(),
          addedAt: Date.now(),
          lastUpdated: Date.now(),
        };

        set((state) => ({
          holdings: [...state.holdings, newHolding],
        }));
      },

      removeHolding: (id) => {
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
        }));
      },

      updateHolding: (id, updates) => {
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === id ? { ...h, ...updates, lastUpdated: Date.now() } : h
          ),
        }));
      },

      calculateTotalValue: (prices) => {
        const { holdings } = get();
        let total = 0;

        holdings.forEach((holding) => {
          const priceData = prices.get(holding.symbol);
          if (priceData) {
            total += holding.amount * priceData.price;
          }
        });

        return total;
      },

      calculateHoldingValue: (holding, currentPrice) => {
        const currentValue = holding.amount * currentPrice;
        const profitLoss = currentValue - holding.totalInvested;
        const profitLossPercent = (profitLoss / holding.totalInvested) * 100;

        return {
          ...holding,
          currentValue,
          profitLoss,
          profitLossPercent,
        };
      },
    }),
    {
      name: 'crypto-portfolio-storage',
    }
  )
);
