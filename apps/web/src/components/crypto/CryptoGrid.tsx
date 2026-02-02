import { useMemo } from 'react';
import { useCryptoStore } from '@/store/cryptoStore';
import { useWatchlistStore } from '@/store/watchlistStore';
import { CryptoPriceCard } from './CryptoPriceCard';
import { PriceUpdate } from '@crypto-tracker/shared-types';

interface CryptoGridProps {
  filter?: 'all' | 'watchlist';
}

export function CryptoGrid({ filter = 'all' }: CryptoGridProps) {
  const prices = useCryptoStore((state) => state.prices);
  const watchlistItems = useWatchlistStore((state) => state.items);

  const priceArray = useMemo(() => {
    const allPrices = Array.from(prices.values());

    if (filter === 'watchlist') {
      const watchlistSymbols = new Set(watchlistItems.map((item) => item.symbol));
      return allPrices.filter((price) => watchlistSymbols.has(price.symbol));
    }

    return allPrices;
  }, [prices, filter, watchlistItems]);

  if (priceArray.length === 0) {
    const message =
      filter === 'watchlist'
        ? 'No cryptocurrencies in your watchlist. Click the star icon on any card to add to watchlist.'
        : 'No cryptocurrency data available. Subscribe to symbols to see prices.';

    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {priceArray.map((priceData) => (
        <CryptoPriceCard key={priceData.symbol} priceData={priceData} />
      ))}
    </div>
  );
}
