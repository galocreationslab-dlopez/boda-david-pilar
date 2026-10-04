"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { PortadaElementoLayout } from "@/config/wedding.config";
import { getPortadaAspectLayout, type PortadaAspectRatio } from "@/lib/portada-aspect-ratio";

export default function PortadaAspectRatioBox({
  layout,
  imageSrc,
  modo,
  referenceRatio,
  children,
}: {
  layout: PortadaElementoLayout;
  imageSrc?: string;
  modo: "aspecto" | "pantallas";
  referenceRatio: number;
  children: ReactNode;
}) {
  const [loadedRatio, setLoadedRatio] = useState<{ src: string; ratio: PortadaAspectRatio }>();

  useEffect(() => {
    if (!layout.mantenerAspecto || !imageSrc) return;
    const image = new Image();
    let disposed = false;
    image.onload = () => {
      if (!disposed && image.naturalWidth > 0 && image.naturalHeight > 0) setLoadedRatio({ src: imageSrc, ratio: { width: image.naturalWidth, height: image.naturalHeight } });
    };
    image.onerror = () => undefined;
    image.src = imageSrc;
    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [imageSrc, layout.mantenerAspecto]);

  const ratio = loadedRatio && loadedRatio.src === imageSrc ? loadedRatio.ratio : undefined;
  const effective = getPortadaAspectLayout(layout, ratio, referenceRatio);
  const vertical = (value: number) => modo === "pantallas" ? `${value}svh` : `${value}%`;
  return (
    <div
      style={{
        position: "absolute",
        left: `${effective.x}%`,
        width: `${effective.w}%`,
        top: vertical(effective.y),
        height: vertical(effective.h),
        zIndex: effective.z ?? 1,
        opacity: (effective.opacidad ?? 100) / 100,
      }}
    >
      {children}
    </div>
  );
}