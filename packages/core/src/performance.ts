export function startTiming(name: string) {
  if (typeof performance === "undefined") return () => {};
  const started = performance.now();
  return () => {
    performance.measure(`church:${name}`, {
      start: started,
      end: performance.now(),
    });
  };
}
