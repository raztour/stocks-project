import { memo } from 'react';
import { PriceUpdate } from '@crypto-tracker/shared-types';
import { useThrottledValue } from '@/hooks/useThrottledValue';
import { formatPrice, formatPercentage, formatVolume, cn } from '@/lib/utils';
import { useWatchlistStore } from '@/store/watchlistStore';

interface CryptoPriceCardProps {
  priceData: PriceUpdate;
}

export const CryptoPriceCard = memo(function CryptoPriceCard({ priceData }: CryptoPriceCardProps) {
  // Throttle updates to 10 FPS (100ms)
  const throttledPrice = useThrottledValue(priceData.price, 100);
  const throttledPercent = useThrottledValue(priceData.priceChangePercent, 100);

  const { isInWatchlist, toggleWatchlist } = useWatchlistStore();
  const inWatchlist = isInWatchlist(priceData.symbol);

  const isPositive = priceData.priceChangePercent >= 0;
  const priceChangeColor = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {priceData.symbol}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatPrice(throttledPrice)}
          </p>
        </div>
        <button
          onClick={() => toggleWatchlist(priceData.symbol)}
          className="text-gray-400 hover:text-yellow-500 transition-colors"
          aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <svg
            className={cn('w-6 h-6', inWatchlist && 'text-yellow-500 fill-current')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">24h Change</span>
          <span className={cn('text-sm font-semibold', priceChangeColor)}>
            {formatPercentage(throttledPercent)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">24h High</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatPrice(priceData.high24h)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">24h Low</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatPrice(priceData.low24h)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Volume</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatVolume(priceData.volume24h)}
          </span>
        </div>
      </div>
    </div>
  );
});
