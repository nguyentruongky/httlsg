import { useEffect, useRef } from "react";
export function useLoadingTiming(name: string, pending: boolean) {
  const started = useRef(performance.now());
  const reported = useRef(false);
  useEffect(() => {
    if (!pending && !reported.current) {
      reported.current = true;
      performance.measure(`church:first-${name}`, {
        start: started.current,
        end: performance.now(),
      });
    }
  }, [name, pending]);
}
