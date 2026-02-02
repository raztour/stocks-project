import { useState, useEffect, useRef } from 'react';

/**
 * Throttles value updates to reduce re-renders
 * @param value - The value to throttle
 * @param delay - Throttle delay in milliseconds (default: 100ms = 10 FPS)
 */
export function useThrottledValue<T>(value: T, delay: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateTime = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    if (timeSinceLastUpdate >= delay) {
      // Update immediately if enough time has passed
      setThrottledValue(value);
      lastUpdateTime.current = now;
    } else {
      // Schedule update for later
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateTime.current = Date.now();
      }, delay - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, delay]);

  return throttledValue;
}
