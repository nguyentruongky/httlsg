import { useEffect, useState } from "react";

// Avoid flashing a loading label for fast requests; keep it visible for slow ones.
export function useDelayedLoading(loading: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, [loading]);
  return loading && visible;
}
