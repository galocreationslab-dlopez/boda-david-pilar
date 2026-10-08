import type { IntroEnvelopeConfig } from "@/config/wedding.config";
import { resolveDriveMediaSrc } from "@/lib/drive-image";

export type EnvelopeTexture = {
  url: string;
  sizePx?: number;
  color: string;
};

export function getEnvelopeResources(config: IntroEnvelopeConfig, texture?: EnvelopeTexture) {
  const finish = config.acabadoPaleta ?? "textura";
  const paletteTexture = finish !== "personalizado" && texture?.url ? texture : undefined;
  return {
    paletteTexture,
    texture: finish === "textura" ? paletteTexture : undefined,
    image: !paletteTexture && (config.modoFondo ?? "colores") !== "colores" ? resolveDriveMediaSrc(config.imagenUrl) : "",
    exterior: resolveDriveMediaSrc(config.fondoExteriorImagenUrl),
    dryStamp: resolveDriveMediaSrc(config.selloSecoUrl),
  };
}
