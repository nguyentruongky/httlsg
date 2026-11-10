"use client";
/** Compatibility for older consumers: OTPs reload only through explicit refresh.
 * This hook intentionally opens no stream and invalidates no cached queries. */
export function useLeaderLiveSync(_enabled: boolean) {
  return false;
}
