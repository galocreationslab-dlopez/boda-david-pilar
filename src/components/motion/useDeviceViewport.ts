"use client";

import { useSyncExternalStore } from "react";

export type DeviceViewport = "desktop" | "movil";

const MOBILE_QUERY = "(width < 768px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// El servidor no conoce el dispositivo: no presenta una intro de PC provisional.
export function useDeviceViewport(): DeviceViewport | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches ? "movil" : "desktop",
    () => null,
  );
}
