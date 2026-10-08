"use client";

import { useEffect, useState } from "react";
import { parseNativeSvgAnimations, svgMarkupHandlesClick, type NativeSvgAnimationOption } from "@/components/motion/AutoDrawSVG";
import { decodeIntroImage, INTRO_RESOURCE_TIMEOUT_MS } from "@/components/motion/useIntroResources";

type ArtworkKind = "loading" | "failed" | "staticSvg" | "interactiveSvg" | "animatedSvg" | "image";
type ArtworkDetection = { kind: ArtworkKind; nativeAnimationOptions: NativeSvgAnimationOption[]; source?: string };

const LOADING: ArtworkDetection = { kind: "loading", nativeAnimationOptions: [] };
const IMAGE: ArtworkDetection = { kind: "image", nativeAnimationOptions: [] };

function classifySvgMarkup(markup: string): ArtworkDetection {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") {
    throw new Error("El recurso SVG no es valido");
  }
  const options = parseNativeSvgAnimations(markup);
  const hasNativeAnimation = options.length > 0 || /<(?:script|animate|animateTransform|animateMotion|set)\b/i.test(markup);
  if (!hasNativeAnimation) return { kind: "staticSvg", nativeAnimationOptions: [] };
  return { kind: svgMarkupHandlesClick(markup) ? "interactiveSvg" : "animatedSvg", nativeAnimationOptions: options };
}

async function detectArtwork(src: string, signal: AbortSignal, retainUrl: (url: string) => void): Promise<ArtworkDetection> {
  const trimmed = src.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) return { ...classifySvgMarkup(trimmed), source: trimmed };

  let res: Response;
  try {
    res = await fetch(src, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    console.warn("[Intro] No se pudo inspeccionar el recurso; se intenta como imagen", src, error);
    await decodeIntroImage(src, signal);
    return { ...IMAGE, source: src };
  }
  if (!res.ok) throw new Error(`No se pudo cargar el recurso (${res.status})`);
  const blob = await res.blob();
  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("image/") || contentType.includes("svg")) {
    const text = await blob.text();
    if (/<svg[\s>]/i.test(text)) return { ...classifySvgMarkup(text), source: text };
  }
  signal.throwIfAborted();
  const source = URL.createObjectURL(blob);
  retainUrl(source);
  await decodeIntroImage(source, signal);
  return { ...IMAGE, source };
}

export function useIntroArtwork(src: string, label = "Recurso"): ArtworkDetection {
  const [state, setState] = useState<{ src: string; detection: ArtworkDetection } | null>(null);

  useEffect(() => {
    if (!src) return;
    let isMounted = true;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    const timer = window.setTimeout(() => controller.abort(new Error(`Tiempo de carga de ${label} agotado`)), INTRO_RESOURCE_TIMEOUT_MS);
    void detectArtwork(src, controller.signal, (url) => { objectUrl = url; }).then((detection) => {
      if (isMounted) setState({ src, detection });
    }).catch((error: unknown) => {
      if (!isMounted) return;
      console.warn(`[Intro] ${label} no disponible`, src, error);
      setState({ src, detection: { kind: "failed", nativeAnimationOptions: [] } });
    }).finally(() => {
      window.clearTimeout(timer);
    });
    return () => {
      isMounted = false;
      window.clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, label]);

  return state && state.src === src ? state.detection : LOADING;
}
