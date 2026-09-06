"use client";

import { useEffect, useState } from "react";

export type DeviceViewport = "desktop" | "movil";

const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Detecta si el viewport actual corresponde a móvil o escritorio usando el
 * mismo punto de corte (768px) que el breakpoint `md` de Tailwind, reevaluado
 * en cada cambio de tamaño/orientación. Devuelve "desktop" hasta el primer
 * render en cliente para evitar desajustes de hidratación.
 */
export function useDeviceViewport(): DeviceViewport {
  const [viewport, setViewport] = useState<DeviceViewport>("desktop");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setViewport(media.matches ? "movil" : "desktop");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return viewport;
}
