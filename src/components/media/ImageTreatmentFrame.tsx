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
  const [nearViewport, setNearViewport] = useState(false);
  const [bounds, setBounds] = useState<{ src: string; width: number; height: number } | null>(null);
  const visible = nearViewport;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px" });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !visible || fit !== "contain") return;
    const measure = () => {
      const image = frame.querySelector("img");
      if (!image?.naturalWidth || !image.naturalHeight) return;
      const scale = Math.min(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight);
      setBounds({ src, width: image.naturalWidth * scale, height: image.naturalHeight * scale });
    };
    frame.addEventListener("load", measure, true);
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    measure();
    return () => {
      frame.removeEventListener("load", measure, true);
      observer.disconnect();
    };
  }, [src, fit, visible]);

  const visibleBounds = fit === "contain" && bounds?.src === src ? bounds : null;

  return (
    <div
      ref={frameRef}
      data-media-state={visible ? "active" : "deferred"}
      onErrorCapture={() => console.error("[Media] No se pudo cargar la imagen", src)}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
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
        {visible ? children : null}
      </div>
    </div>
  );
}