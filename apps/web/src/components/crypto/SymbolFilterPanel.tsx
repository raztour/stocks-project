'use client';

export interface SymbolFilterPanelProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  isSearchActive: boolean;
  filteredSymbols: string[];
  selectedSymbols: string[];
  onToggleSymbol: (symbol: string) => void;
}

interface SymbolSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SymbolSearchInput({ value, onChange }: SymbolSearchInputProps) {
  return (
    <div className="px-2 pb-2 border-b border-gray-200 dark:border-gray-600">
      <input
        type="text"
        placeholder="Search symbols..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Filter symbols"
      />
    </div>
  );
}

interface SymbolFilterActionsProps {
  onSelectAll: () => void;
  onClearAll: () => void;
  isSearchActive: boolean;
}

function SymbolFilterActions({
  onSelectAll,
  onClearAll,
  isSearchActive,
}: SymbolFilterActionsProps) {
  return (
    <div className="flex gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
      <button
        type="button"
        onClick={onSelectAll}
        className="text-xs font-medium text-primary hover:underline"
        title={isSearchActive ? 'Add all visible symbols to selection' : undefined}
      >
        {isSearchActive ? 'Select all visible' : 'Select all'}
      </button>
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-gray-500 hover:underline"
      >
        Clear
      </button>
    </div>
  );
}

interface SymbolFilterListProps {
  filteredSymbols: string[];
  selectedSymbols: string[];
  onToggleSymbol: (symbol: string) => void;
}

function SymbolFilterList({
  filteredSymbols,
  selectedSymbols,
  onToggleSymbol,
}: SymbolFilterListProps) {
  return (
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
                onChange={() => onToggleSymbol(symbol)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                tabIndex={-1}
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">{symbol}</span>
            </label>
          </li>
        ))
      )}
    </ul>
  );
}

export function SymbolFilterPanel({
  searchQuery,
  onSearchChange,
  onSelectAll,
  onClearAll,
  isSearchActive,
  filteredSymbols,
  selectedSymbols,
  onToggleSymbol,
}: SymbolFilterPanelProps) {
  return (
    <div
      className="absolute left-0 top-full mt-1 z-10 w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-2 max-h-80 overflow-y-auto"
      role="listbox"
      aria-label="Symbol list"
    >
      <SymbolSearchInput value={searchQuery} onChange={onSearchChange} />
      <SymbolFilterActions
        onSelectAll={onSelectAll}
        onClearAll={onClearAll}
        isSearchActive={isSearchActive}
      />
      <SymbolFilterList
        filteredSymbols={filteredSymbols}
        selectedSymbols={selectedSymbols}
        onToggleSymbol={onToggleSymbol}
      />
    </div>
  );
}
