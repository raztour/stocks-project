# Code review: dynamic-symbols branch

Review of the symbol filter feature (SymbolSelector, persisted selection/filter, CryptoGrid filtering).

**Status: All listed issues have been fixed.**

---

## What’s working well

- **Clear separation**: Dashboard owns `selectedSymbols` and `filter`, SymbolSubscriber and CryptoGrid consume them. Data flow is easy to follow.
- **CryptoGrid fix**: Passing `selectedSymbols` into the grid and filtering by it when `filter === 'all'` correctly fixes the bug where cards didn’t update when changing selection.
- **Validation of persisted symbols**: `getInitialSymbols()` only keeps symbols that exist in `availableSet`, so bad or stale localStorage data doesn’t break the app.
- **Search UX**: Search in SymbolSelector resets when the dropdown closes; “Select all” adds only the currently filtered list to the selection.
- **Filter persistence**: `getInitialFilter()` validates the stored value and falls back to `'all'`.

---

## Critical: localStorage not used on first load (SSR)

**Issue:** Initial state is computed with `useState(getInitialSymbols)` and `useState(getInitialFilter)`. In Next.js, the first render of a `'use client'` component can run on the server. There `typeof window === 'undefined'`, so both helpers return the default (DEFAULT_SYMBOLS and `'all'`). That initial state is then serialized and used on the client, so **we never read from localStorage on first load**. Persisted symbol selection and filter are ignored until the user changes them in the same session.

**Fix:** Hydrate from localStorage after mount on the client, e.g. in `dashboard/page.tsx`:

```ts
const [selectedSymbols, setSelectedSymbols] = useState<string[]>(() => [...DEFAULT_SYMBOLS]);
const [filter, setFilter] = useState<'all' | 'watchlist'>('all');
const [hasHydrated, setHasHydrated] = useState(false);

useEffect(() => {
  setSelectedSymbols(getInitialSymbols());
  setFilter(getInitialFilter());
  setHasHydrated(true);
}, []);
```

Then use `hasHydrated` if you need to avoid rendering the grid or SymbolSubscriber with defaults before hydration (optional). Alternatively, keep a single source of truth by initializing to defaults and only calling `setSelectedSymbols(getInitialSymbols())` and `setFilter(getInitialFilter())` inside one `useEffect` that runs once on mount.

---

## Medium: Empty selection shows stale cards

**File:** `CryptoGrid.tsx`

**Issue:** When the user clears all symbols (`selectedSymbols === []`), the condition `selectedSymbols.length > 0` is false, so the grid falls back to `return allPrices`. The grid then shows all prices still in the store (stale data for symbols we’ve unsubscribed from), instead of an empty state.

**Fix:** In “all” mode, always filter by `selectedSymbols`, even when it’s empty:

```ts
// When "all", only show cards for symbols the user has selected (subscribed)
const selectedSet = new Set(selectedSymbols);
return allPrices.filter((price) => selectedSet.has(price.symbol));
```

Then when `selectedSymbols` is `[]`, the grid shows no cards and the existing empty-state message is correct.

---

## Minor / nice-to-have

### 1. SymbolSubscriber: full unsubscribe then subscribe

**File:** `SymbolSubscriber.tsx`

When `symbols` changes from `[A, B, C]` to `[A, B]`, the effect cleanup runs `unsubscribe([A, B, C])` and the new effect runs `subscribe([A, B])`. So we briefly unsubscribe from A and B and then re-subscribe. Functionally this is fine, but it adds churn on the backend. A small improvement would be to compute the diff (symbols to add, symbols to remove) and call subscribe/unsubscribe only for the delta. Not blocking.

### 2. Normalize persisted symbols (e.g. case)

**File:** `dashboard/page.tsx` – `getInitialSymbols()`

If someone edits localStorage and uses `"btcusdt"` instead of `"BTCUSDT"`, `availableSet.has("btcusdt")` is false and that symbol is dropped. Normalizing with `.toUpperCase()` before the `availableSet.has(s)` check would make the loader more forgiving.

### 3. Accessibility – SymbolSelector

The dropdown trigger and list are not exposed to assistive tech. Consider:

- `aria-expanded={isOpen}` and `aria-haspopup="listbox"` on the trigger button.
- `role="listbox"` on the list and `role="option"` on each row (or use a combobox pattern with `aria-activedescendant` if you want keyboard navigation). This improves screen-reader and keyboard UX.

### 4. Unused variable

**File:** `dashboard/page.tsx`

`connectionStatus` is destructured from `useCryptoStore()` but not used. Safe to remove from the destructuring if it’s not needed for future UI.

### 5. SymbolSelector “Select all” label

When the list is filtered by search, “Select all” adds only the visible (filtered) symbols to the selection. Consider a label like “Select all visible” when `searchQuery.trim()` is non-empty, or a tooltip, so the behavior is clear.

---

## Summary

| Severity | Item | Action |
|----------|------|--------|
| Critical | Persisted symbols/filter not applied on first load (SSR) | Hydrate from localStorage in `useEffect` on mount |
| Medium   | Empty selection still shows all stored prices in grid | Always filter by `selectedSymbols` when `filter === 'all'` |
| Minor    | SymbolSubscriber full unsubscribe/subscribe on change | Optional: diff and subscribe/unsubscribe only delta |
| Minor    | Case-sensitive validation of stored symbols | Optional: normalize (e.g. `.toUpperCase()`) in `getInitialSymbols` |
| Minor    | A11y and “Select all” label | Optional improvements |

Fixing the critical and medium items will make persistence and empty-selection behavior correct; the rest are incremental improvements.
