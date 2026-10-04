"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  mantenerAspecto?: boolean;
  fijar?: "ancho" | "alto";
  alineacion?: "arriba" | "centroVertical" | "abajo" | "izquierda" | "centroHorizontal" | "derecha";
  filter?: string;
};

export default function AspectRatioImage({ src, alt, width, height, mantenerAspecto, fijar = "ancho", alineacion = "centroVertical", filter }: Props) {
  const [loadedRatio, setLoadedRatio] = useState<{ src: string; value: number }>();
  useEffect(() => {
    const image = new Image();
    let disposed = false;
    image.onload = () => {
      if (!disposed && image.naturalWidth > 0 && image.naturalHeight > 0) setLoadedRatio({ src, value: image.naturalWidth / image.naturalHeight });
    };
    image.src = src;
    return () => {
      disposed = true;
      image.onload = null;
    };
  }, [src]);

  const validWidth = Number.isFinite(width) && width > 0 ? width : 40;
  const validHeight = Number.isFinite(height) && height > 0 ? height : 40;
  const ratio = loadedRatio?.src === src ? loadedRatio.value : undefined;
  const calculatedWidth = fijar === "alto" && ratio ? validHeight * ratio : validWidth;
  const calculatedHeight = fijar === "ancho" && ratio ? validWidth / ratio : validHeight;
  const justifyContent = alineacion === "derecha" ? "flex-end" : alineacion === "centroHorizontal" ? "center" : "flex-start";
  const alignItems = alineacion === "abajo" ? "flex-end" : alineacion === "centroVertical" ? "center" : "flex-start";
  const frameStyle: CSSProperties = mantenerAspecto ? { width: validWidth, height: validHeight, display: "flex", justifyContent, alignItems } : {};
  const imageStyle: CSSProperties = mantenerAspecto
    ? { width: calculatedWidth, height: calculatedHeight, maxWidth: "none", maxHeight: "none", objectFit: "contain", filter }
    : { width: width || "auto", height: height || (width ? "auto" : 40), maxWidth: width ? undefined : "14rem", filter };
  if (!mantenerAspecto) return <img src={src} alt={alt} className="block object-contain" style={imageStyle} />;
  return (
    <div style={frameStyle}>
      <img src={src} alt={alt} className="block object-contain" style={imageStyle} />
    </div>
  );
}