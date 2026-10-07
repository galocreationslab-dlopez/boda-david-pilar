"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { WeddingConfig } from "@/config/wedding.config";
import { DESKTOP_BREAKPOINT, getPageBackgroundStyle, getUsefulViewport, normalizePageMargins } from "@/lib/wedding-viewport";
import { resolveDriveMediaSrc } from "@/lib/drive-image";

const ViewportContext = createContext<{ height?: number; inset: boolean }>({ inset: false });
export const useWeddingViewport = () => useContext(ViewportContext);

export default function WeddingViewport({ design, device, resolveSrc = resolveDriveMediaSrc, children }: {
  design: WeddingConfig["diseno"];
  device?: "pc" | "movil";
  resolveSrc?: (src?: string) => string;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [inset, setInset] = useState(false);
  const { izquierdo, derecho } = normalizePageMargins(design?.margenesPc);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const width = Number.parseFloat(getComputedStyle(frame).width);
      const desktop = device ? device === "pc" : window.innerWidth >= DESKTOP_BREAKPOINT;
      const useful = getUsefulViewport(width, { izquierdo, derecho }, desktop);
      frame.style.setProperty("--wedding-left", `${useful.left}px`);
      frame.style.setProperty("--wedding-right", `${useful.right}px`);
      frame.style.setProperty("--wedding-width", `${useful.width}px`);
      frame.style.setProperty("--wedding-vw", `${useful.width / 100}px`);
      setInset(useful.left + useful.right > 0);
      // Las vistas previas simulan una pantalla; reducir su ancho no cambia su alto.
      if (device) {
        const previewHeight = width / (device === "pc" ? 16 / 9 : 9 / 16);
        frame.style.setProperty("--wedding-svh", `${previewHeight / 100}px`);
        frame.style.setProperty("--wedding-vh", `${previewHeight / 100}px`);
        setHeight(previewHeight);
      } else {
        frame.style.setProperty("--wedding-svh", "1svh");
        frame.style.setProperty("--wedding-vh", "1vh");
        setHeight(undefined);
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [device, izquierdo, derecho]);

  const backgroundStyle = getPageBackgroundStyle(design, resolveSrc);
  const style = {
    ...backgroundStyle,
    "--wedding-loading-background": backgroundStyle.backgroundColor,
    "--wedding-margin-left": `${izquierdo}px`,
    "--wedding-margin-right": `${derecho}px`,
  } as CSSProperties;

  return (
    <ViewportContext.Provider value={{ height, inset }}>
      <div ref={frameRef} className="wedding-viewport" data-device={device} style={style}>
        <div className="wedding-content">{children}</div>
      </div>
    </ViewportContext.Provider>
  );
}
