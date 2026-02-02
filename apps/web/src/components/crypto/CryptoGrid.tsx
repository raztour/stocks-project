import { useMemo } from 'react';
import { useCryptoStore } from '@/store/cryptoStore';
import { CryptoPriceCard } from './CryptoPriceCard';
import { PriceUpdate } from '@crypto-tracker/shared-types';

export function CryptoGrid() {
  const prices = useCryptoStore((state) => state.prices);

  const priceArray = useMemo(() => {
    return Array.from(prices.values());
  }, [prices]);

  if (priceArray.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No cryptocurrency data available. Subscribe to symbols to see prices.
        </p>
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
