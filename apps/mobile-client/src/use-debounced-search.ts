import { useEffect, useState } from "react";

// Search inputs update immediately; filtering and requests wait until typing stops.
export function useDebouncedSearch(value: string) {
  const search = value.trim();
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 500);
    return () => window.clearTimeout(timer);
  }, [search]);
  return debounced;
}
