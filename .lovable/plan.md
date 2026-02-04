
# Search History Dropdown

Add a dropdown panel that appears when the user focuses on the search input, displaying all recent searches (up to 5) with the ability to quickly select, delete individual items, or clear all history.

## Current State
- Search history already exists via the `useSearchHistory` hook storing up to 5 items in `localStorage`
- History is currently shown as inline chips below the search bar (only when input is empty)
- Limited to showing 1-2 items due to space constraints

## Implementation Approach

### Use Popover for the Dropdown
We'll use the existing `Popover` component from Radix UI to create a dropdown that:
- Appears when the input is focused AND there is search history
- Stays open while interacting with history items
- Closes when clicking outside or after selecting a search
- Has proper z-index to appear above other content

### UI Design

```text
┌─────────────────────────────────────────────────────┐
│ 🔍  [Search input field...                   ] [Go] │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  Recent Searches                        [Clear all] │
├─────────────────────────────────────────────────────┤
│  🕐 creatures that make treasure tokens        [×]  │
│  🕐 cheap green ramp spells                    [×]  │
│  🕐 artifacts that produce 2 mana              [×]  │
│  🕐 mono red stax pieces                       [×]  │
│  🕐 commander-legal tutors under $10           [×]  │
└─────────────────────────────────────────────────────┘
```

### Changes Required

**1. Add `removeFromHistory` function to `useSearchHistory` hook**
- New function to remove a single item by query string
- Updates both state and localStorage

**2. Add dropdown state management**
- Track `showHistoryDropdown` state (boolean)
- Open on input focus when history exists
- Close on blur (with delay for click handling), on search execution, or on Escape key

**3. Add Popover-based dropdown UI**
- Position below the search input container
- Show all 5 history items (not truncated to 1-2)
- Each item shows: Clock icon, query text, delete button (X)
- Header with "Recent Searches" label and "Clear all" button
- Proper accessibility: keyboard navigation, focus trapping

**4. Handle interaction edge cases**
- Clicking a history item: set query, trigger search, close dropdown
- Clicking delete (X) on an item: remove that item, keep dropdown open
- Clicking "Clear all": remove all history, close dropdown
- Blur with timeout to allow clicking items before closing

## Technical Details

### New State
```typescript
const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);
```

### Updated `useSearchHistory` hook
```typescript
const removeFromHistory = useCallback((queryToRemove: string) => {
  setHistory((prev) => {
    const updated = prev.filter(
      (q) => q.toLowerCase() !== queryToRemove.toLowerCase()
    );
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage failures.
    }
    return updated;
  });
}, []);

return { history, addToHistory, removeFromHistory, clearHistory };
```

### Dropdown visibility logic
```typescript
// Show dropdown when focused AND has history AND no current query being typed
const shouldShowDropdown = isFocused && history.length > 0;
```

### Input handlers update
```typescript
onFocus={() => {
  setIsFocused(true);
  if (history.length > 0) {
    setShowHistoryDropdown(true);
  }
}}
onBlur={() => {
  setIsFocused(false);
  // Delay closing to allow clicking dropdown items
  setTimeout(() => {
    setShowHistoryDropdown(false);
  }, 150);
}}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/UnifiedSearchBar.tsx` | Add `removeFromHistory` to hook, add dropdown state, add Popover-based dropdown UI, update input handlers |

## Accessibility Considerations
- Dropdown items are keyboard navigable (arrow keys)
- Escape key closes dropdown
- Screen reader announces "Recent Searches" section
- Each item has proper aria-label for delete action
- Focus management when dropdown opens/closes
