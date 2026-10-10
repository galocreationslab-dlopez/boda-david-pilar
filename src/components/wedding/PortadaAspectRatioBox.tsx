"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PortadaElementoLayout } from "@/config/wedding.config";
import { getPortadaAspectLayout, type PortadaAspectRatio } from "@/lib/portada-aspect-ratio";
import { useWeddingViewport } from "@/components/layout/WeddingViewport";

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
  const viewport = useWeddingViewport();
  const ref = useRef<HTMLDivElement>(null);
  const [screenRatio, setScreenRatio] = useState<number>();

  useEffect(() => {
    const canvas = ref.current?.parentElement;
    if (!canvas || !viewport.inset || modo !== "pantallas" || !layout.mantenerAspecto) return;
    const measure = document.createElement("div");
    measure.style.cssText = "position:absolute;width:0;height:calc(100 * var(--wedding-svh, 1svh));visibility:hidden;pointer-events:none";
    canvas.appendChild(measure);
    const update = () => {
      const height = Number.parseFloat(getComputedStyle(measure).height);
      if (height > 0) setScreenRatio(canvas.clientWidth / height);
    };
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    observer.observe(measure);
    update();
    return () => { observer.disconnect(); measure.remove(); };
  }, [modo, layout.mantenerAspecto, viewport.inset]);

  const ratio = loadedRatio && loadedRatio.src === imageSrc ? loadedRatio.ratio : undefined;
  const effective = getPortadaAspectLayout(layout, ratio, viewport.inset ? screenRatio ?? referenceRatio : referenceRatio);
  const vertical = (value: number) => modo === "pantallas" ? `calc(${value} * var(--wedding-svh, 1svh))` : `${value}%`;
  return (
    <div
      ref={ref}
      onLoadCapture={(event) => {
        const image = event.target;
        if (layout.mantenerAspecto && imageSrc && image instanceof HTMLImageElement && image.naturalWidth > 0 && image.naturalHeight > 0) {
          setLoadedRatio({ src: imageSrc, ratio: { width: image.naturalWidth, height: image.naturalHeight } });
        }
      }}
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