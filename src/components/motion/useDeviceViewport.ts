"use client";

import { createContext, createElement, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getDeviceViewportQuery } from "@/lib/wedding-viewport";

export type DeviceViewport = "desktop" | "movil";

const DeviceViewportContext = createContext<{ landscapeAsDesktop: boolean; device?: "pc" | "movil" }>({
  landscapeAsDesktop: true,
});

export function DeviceViewportProvider({ landscapeAsDesktop, device, children }: {
  landscapeAsDesktop: boolean;
  device?: "pc" | "movil";
  children: ReactNode;
}) {
  return createElement(DeviceViewportContext.Provider, { value: { landscapeAsDesktop, device } }, children);
}

function subscribe(onChange: () => void, landscapeAsDesktop: boolean, device?: "pc" | "movil") {
  if (device) return () => {};
  const media = window.matchMedia(getDeviceViewportQuery(landscapeAsDesktop));
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(landscapeAsDesktop: boolean, device?: "pc" | "movil"): DeviceViewport {
  if (device) return device === "pc" ? "desktop" : "movil";
  return window.matchMedia(getDeviceViewportQuery(landscapeAsDesktop)).matches ? "movil" : "desktop";
}

// El servidor no conoce el dispositivo: no presenta una intro de PC provisional.
export function useDeviceViewport(): DeviceViewport | null {
  const { landscapeAsDesktop, device } = useContext(DeviceViewportContext);
  const subscribeToDevice = useCallback(
    (onChange: () => void) => subscribe(onChange, landscapeAsDesktop, device),
    [landscapeAsDesktop, device],
  );
  return useSyncExternalStore(
    subscribeToDevice,
    () => getSnapshot(landscapeAsDesktop, device),
    () => null,
  );
}
