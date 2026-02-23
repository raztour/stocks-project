'use client';

import { useRef, useEffect, useState } from 'react';

interface SymbolSelectorProps {
  availableSymbols: string[];
  selectedSymbols: string[];
  onChange: (selected: string[]) => void;
}

export function SymbolSelector({
  availableSymbols,
  selectedSymbols,
  onChange,
}: SymbolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const filteredSymbols = searchQuery.trim()
    ? availableSymbols.filter((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : availableSymbols;

  const toggleSymbol = (symbol: string) => {
    const next = selectedSymbols.includes(symbol)
      ? selectedSymbols.filter((s) => s !== symbol)
      : [...selectedSymbols, symbol];
    onChange(next);
  };

  const selectAll = () => onChange([...new Set([...selectedSymbols, ...filteredSymbols])]);
  const clearAll = () => onChange([]);

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Choose symbols to display"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Symbols ({selectedSymbols.length})
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-10 w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-2 max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="Symbol list"
        >
          <div className="px-2 pb-2 border-b border-gray-200 dark:border-gray-600">
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.stopPropagation()}
              aria-label="Filter symbols"
            />
          </div>
          <div className="flex gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
              title={isSearchActive ? 'Add all visible symbols to selection' : undefined}
            >
              {isSearchActive ? 'Select all visible' : 'Select all'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-gray-500 hover:underline"
            >
              Clear
            </button>
          </div>
          <ul className="py-1">
            {filteredSymbols.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No symbols match
              </li>
            ) : (
            filteredSymbols.map((symbol) => (
              <li
                key={symbol}
                role="option"
                aria-selected={selectedSymbols.includes(symbol)}
                aria-label={`${symbol} ${selectedSymbols.includes(symbol) ? 'selected' : 'not selected'}`}
              >
                <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedSymbols.includes(symbol)}
                    onChange={() => toggleSymbol(symbol)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                    tabIndex={-1}
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{symbol}</span>
                </label>
              </li>
            ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
