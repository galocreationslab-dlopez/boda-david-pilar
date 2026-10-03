"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ItemSeccionDiseno } from "@/config/wedding.config";
import { resolveDriveMediaSrc } from "@/lib/drive-image";

type Props = {
  items: ItemSeccionDiseno[];
  resolveSrc?: (src: string) => string;
  navigationStyle?: CSSProperties;
};

export function SeccionCarrusel({ items, resolveSrc = resolveDriveMediaSrc, navigationStyle }: Props) {
  const photos = items.filter((item) => item.imagen?.trim());
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const current = Math.min(active, Math.max(0, photos.length - 1));

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      if (track.clientWidth > 0) {
        track.scrollTo({ left: Math.min(activeRef.current, photos.length - 1) * track.clientWidth, behavior: "instant" });
      }
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [photos.length]);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.max(0, Math.min(photos.length - 1, index));
    track.scrollTo({
      left: target * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  if (photos.length === 0) {
    return <p className="container-wedding py-10 text-center text-sm text-brown-mid">No hay fotos en este carrusel.</p>;
  }

  return (
    <div className="container-wedding py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg" role="region" aria-roledescription="carrusel" aria-label="Fotos">
        <div className="relative">
          <div
            ref={trackRef}
            tabIndex={0}
            aria-label="Fotos del carrusel"
            className="flex aspect-[4/5] max-h-[70svh] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-lg bg-[var(--cream-dark)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ overscrollBehaviorX: "contain" }}
            onScroll={(event) => {
              const track = event.currentTarget;
              if (track.clientWidth > 0) {
                activeRef.current = Math.round(track.scrollLeft / track.clientWidth);
                setActive(activeRef.current);
              }
            }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              goTo(event.key === "Home" ? 0 : event.key === "End" ? photos.length - 1 : current + (event.key === "ArrowRight" ? 1 : -1));
            }}
          >
            {photos.map((photo, index) => (
              <div key={`${photo.id}:${photo.imagen}`} className="relative h-full w-full shrink-0 snap-start snap-always" role="group" aria-roledescription="diapositiva" aria-label={`${index + 1} de ${photos.length}`}>
                {failed[`${photo.id}:${photo.imagen}`] ? (
                  <p className="flex h-full items-center justify-center p-6 text-center text-sm text-brown-mid">No se pudo cargar esta foto.</p>
                ) : (
                  <img
                    src={resolveSrc(photo.imagen!)}
                    alt={photo.titulo || `Foto ${index + 1}`}
                    className="h-full w-full object-contain"
                    loading={index === 0 ? "eager" : "lazy"}
                    draggable={false}
                    onError={() => setFailed((previous) => ({ ...previous, [`${photo.id}:${photo.imagen}`]: true }))}
                  />
                )}
              </div>
            ))}
          </div>
          {photos.length > 1 && (
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs tabular-nums text-white" aria-live="polite" aria-atomic="true">
              {current + 1} / {photos.length}
            </span>
          )}
        </div>
        {photos.length > 1 && (
          <div className="mt-3 flex items-center gap-2" style={navigationStyle}>
            <button type="button" aria-label="Foto anterior" title="Foto anterior" disabled={current === 0} onClick={() => goTo(current - 1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current text-2xl disabled:opacity-30">&#8249;</button>
            <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto" aria-label="Seleccionar foto">
              {photos.map((photo, index) => (
                <button key={photo.id} type="button" aria-label={`Ir a foto ${index + 1}`} aria-current={current === index ? "true" : undefined} title={`Foto ${index + 1}`} onClick={() => goTo(index)} className="flex h-11 w-6 shrink-0 items-center justify-center">
                  <span className={`h-2 w-2 rounded-full bg-current ${current === index ? "opacity-100" : "opacity-30"}`} />
                </button>
              ))}
            </div>
            <button type="button" aria-label="Foto siguiente" title="Foto siguiente" disabled={current === photos.length - 1} onClick={() => goTo(current + 1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current text-2xl disabled:opacity-30">&#8250;</button>
          </div>
        )}
      </div>
    </div>
  );
}