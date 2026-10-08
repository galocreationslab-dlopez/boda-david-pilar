"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getGoogleMapsEmbedUrl, getGoogleMapsLinkUrl } from "@/lib/portada-libre";
import styles from "./ImageMapFlip.module.css";

export function MapBack({ link, embed, label, onClose }: { link: string; embed?: string; label: string; onClose: () => void }) {
  const src = getGoogleMapsEmbedUrl(embed || link);
  const href = getGoogleMapsLinkUrl(link);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(Boolean(src));
  const backRef = useRef<HTMLElement>(null);
  const loadedRef = useRef(false);
  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    if (!src) return;
    const timeout = setTimeout(() => {
      if (!loadedRef.current) { setFailed(true); setLoading(false); }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [src]);
  return (
    <section ref={backRef} tabIndex={-1} data-map-back className={styles.back} aria-label={`Mapa de ${label}. Pulsa fuera para volver.`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    }}>
      <div className={styles.mapArea}>
      {src && !failed && (
        <iframe
          src={src}
          title={`Ubicación de ${label}`}
          className={styles.map}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={() => { loadedRef.current = true; setLoading(false); }}
          onError={() => { setFailed(true); setLoading(false); }}
        />
      )}
      {loading && <p className={styles.status} role="status">Cargando mapa…</p>}
      {(!src || failed) && <p className={styles.error} role="alert">No se puede mostrar el mapa. {href ? "Puedes abrir la ubicación con Cómo llegar." : "El enlace de Google Maps no es válido."}</p>}
      </div>
      <div className={styles.footer}>
        {href && <a href={href} target="_blank" rel="noopener noreferrer" className={styles.directions}>Cómo llegar</a>}
        {src && !failed && !loading && <button type="button" className={styles.help} onClick={() => setFailed(true)}>¿No ves el mapa?</button>}
      </div>
    </section>
  );
}

export default function ImageMapFlip({ children, link, embed, label, enabled = true, contentSized = false, className = "", frontClassName = "" }: {
  children: ReactNode;
  link?: string;
  embed?: string;
  label: string;
  enabled?: boolean;
  contentSized?: boolean;
  className?: string;
  frontClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const id = useId();
  const interactive = enabled && Boolean(link);
  useEffect(() => {
    if (!open) return;
    const outsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        restoreFocus.current = Boolean(rootRef.current?.contains(document.activeElement));
        setOpen(false);
      }
    };
    document.addEventListener("click", outsideClick, true);
    return () => document.removeEventListener("click", outsideClick, true);
  }, [open]);
  useLayoutEffect(() => {
    if (!open && restoreFocus.current) {
      triggerRef.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [open]);
  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
  };
  const back = open && link ? <MapBack key={`${link}:${embed}`} link={link} embed={embed} label={label} onClose={close} /> : null;
  return (
    <div ref={rootRef} className={`${styles.root} ${open ? styles.open : ""} ${className}`} style={contentSized ? undefined : { width: "100%", height: "100%" }}>
      <div
        ref={triggerRef}
        role={interactive ? "button" : undefined}
        className={`${styles.front} ${contentSized ? styles.contentSized : ""} ${frontClassName}`}
        aria-label={interactive ? `Mostrar mapa de ${label}` : undefined}
        aria-expanded={interactive ? open : undefined}
        aria-controls={interactive ? id : undefined}
        aria-hidden={open || undefined}
        inert={open}
        tabIndex={interactive && !open ? 0 : undefined}
        onClickCapture={(event) => {
          if (!interactive || open) return;
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!interactive || open || event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }
        }}
      >{children}</div>
      <div id={id} className={styles.inline}>{back}</div>
    </div>
  );
}
