"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TratamientoImagen } from "@/config/wedding.config";
import { getImageTreatmentStyle } from "@/lib/image-treatment";

export default function ImageTreatmentFrame({
  src,
  fit,
  treatment,
  children,
}: {
  src: string;
  fit: "contain" | "cover";
  treatment?: TratamientoImagen;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ src: string; width: number; height: number } | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || fit !== "contain") return;
    const image = new Image();
    let disposed = false;
    const measure = () => {
      if (disposed || !image.naturalWidth || !image.naturalHeight) return;
      const scale = Math.min(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight);
      setBounds({ src, width: image.naturalWidth * scale, height: image.naturalHeight * scale });
    };
    image.onload = measure;
    image.src = src;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    measure();
    return () => {
      disposed = true;
      image.onload = null;
      observer.disconnect();
    };
  }, [src, fit]);

  const visibleBounds = fit === "contain" && bounds?.src === src ? bounds : null;

  return (
    <div ref={frameRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        className="content-texture-media"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: visibleBounds ? `${visibleBounds.width}px` : "100%",
          height: visibleBounds ? `${visibleBounds.height}px` : "100%",
          ...getImageTreatmentStyle(treatment),
        }}
      >
        {children}
      </div>
    </div>
  );
}