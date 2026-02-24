'use client';

import { useRef, useEffect, useState } from 'react';
import { SymbolFilterPanel } from './SymbolFilterPanel';

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
        <SymbolFilterPanel
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectAll={selectAll}
          onClearAll={clearAll}
          isSearchActive={isSearchActive}
          filteredSymbols={filteredSymbols}
          selectedSymbols={selectedSymbols}
          onToggleSymbol={toggleSymbol}
        />
      )}
    </div>
  );
}
