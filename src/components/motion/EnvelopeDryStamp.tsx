"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AutoDrawSVG from "@/components/motion/AutoDrawSVG";
import { useIntroArtwork } from "@/components/motion/useIntroArtwork";
import { INTRO_RESOURCE_TIMEOUT_MS } from "@/components/motion/useIntroResources";

type Props = {
  src: string;
  svgRelief: boolean;
  reduceMotion: boolean;
  onStatus: (status: { src: string; failed: boolean; image: boolean }) => void;
};

function staticSvg(markup: string): string {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  doc.querySelectorAll("script, animate, animateTransform, animateMotion, set").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
    }
  });
  const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = "* { animation: none !important; transition: none !important; }";
  doc.documentElement.appendChild(style);
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export default function EnvelopeDryStamp({ src, svgRelief, reduceMotion, onStatus }: Props) {
  const { kind, source } = useIntroArtwork(src, "Sello seco");
  const svgSource = useMemo(() => source && kind !== "image" && reduceMotion ? staticSvg(source) : source, [source, kind, reduceMotion]);
  const [renderedSource, setRenderedSource] = useState<string>();
  const [failedSource, setFailedSource] = useState<string>();
  const failed = kind === "failed" || Boolean(svgSource && failedSource === svgSource);
  const ready = failed || kind === "image" || Boolean(svgSource && renderedSource === svgSource);
  const markReady = useCallback(() => setRenderedSource(svgSource), [svgSource]);

  useEffect(() => {
    if (ready) onStatus({ src, failed, image: kind === "image" });
  }, [ready, src, failed, kind, onStatus]);

  useEffect(() => {
    if (!svgSource || ready) return;
    const timer = window.setTimeout(() => {
      console.warn("[Intro] El SVG del sello seco no pudo prepararse", src);
      setFailedSource(svgSource);
    }, INTRO_RESOURCE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [svgSource, ready, src]);

  if (failed || !svgSource) return null;

  return (
    <>
      <style>{`
        [data-envelope-dry-stamp-artwork] > div { height: 100% !important; aspect-ratio: auto !important; }
        [data-envelope-dry-stamp-artwork] > div > svg { width: 100% !important; height: 100% !important; max-width: 100%; max-height: 100%; }
      `}</style>
      <div data-envelope-dry-stamp-artwork className="h-full w-full" style={{
        filter: kind !== "image" && svgRelief
          ? "drop-shadow(-1px -1px 1px rgba(255,255,255,.9)) drop-shadow(1px 1px 1px rgba(0,0,0,.35))"
          : "none",
      }}>
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={svgSource} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <AutoDrawSVG key={svgSource} svgSource={svgSource} animate={false} onReady={markReady} className="h-full w-full" />
        )}
      </div>
    </>
  );
}
