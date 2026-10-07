"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export const INTRO_RESOURCE_TIMEOUT_MS = 30000;

export function decodeIntroImage(src: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: unknown) => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve();
    };
    const abort = () => {
      image.src = "";
      finish(signal.reason);
    };
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => {
      void image.decode().then(() => finish(), (error: unknown) => finish(error));
    };
    image.onerror = () => finish(new Error(`No se pudo cargar la imagen de la intro: ${src}`));
    image.decoding = "async";
    image.fetchPriority = "high";
    image.src = src;
  });
}

export function useIntroImages(sources: string[]) {
  const key = JSON.stringify([...new Set(sources.filter(Boolean))]);
  const [result, setResult] = useState<{ key: string; failed: string[] }>();

  useEffect(() => {
    const urls: string[] = JSON.parse(key);
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => controller.abort(new Error("Tiempo de carga de la intro agotado")), INTRO_RESOURCE_TIMEOUT_MS);
    void Promise.all(urls.map(async (src) => {
      try {
        await decodeIntroImage(src, controller.signal);
        return null;
      } catch (error) {
        if (!cancelled) console.warn("[Intro] Imagen no disponible", src, error);
        return src;
      }
    })).then((failures) => {
      window.clearTimeout(timer);
      if (!cancelled) setResult({ key, failed: failures.filter((src): src is string => src !== null) });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  return { ready: result?.key === key, failed: result?.key === key ? result.failed : [] };
}

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useIntroReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
