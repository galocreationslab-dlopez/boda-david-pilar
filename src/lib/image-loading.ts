import { weddingImageLoadingOrder, type SeccionDiseno } from "@/config/wedding.config";
import { getElementoLayout, normalizePortadaLibre, type PortadaDispositivo } from "@/lib/portada-libre";
import { resolveDriveMediaSrc } from "@/lib/drive-image";

export type ImageLoadingGroup = { name: string; sources: string[] };

export function getImageLoadingGroups(sections: SeccionDiseno[], device: PortadaDispositivo): ImageLoadingGroup[] {
  const groups: ImageLoadingGroup[] = [
    { name: "pinturas", sources: [] },
    { name: "ramas", sources: [] },
    { name: "carrusel", sources: [] },
    { name: "informacion", sources: [] },
  ];
  const seen = new Set<string>();
  const add = (index: number, value?: string) => {
    const src = resolveDriveMediaSrc(value);
    if (src && !seen.has(src)) {
      seen.add(src);
      groups[index].sources.push(src);
    }
  };
  const freeImages = sections.flatMap((section) => {
    const free = section.tipo === "pie" ? section.pie : section.tipo === "portadaLibre" ? section.portadaLibre : undefined;
    if (!free) return [];
    const config = normalizePortadaLibre(free);
    return config.elementos.filter((element, index) =>
      element.tipo === "imagen" && !getElementoLayout(config, device, element, index).oculto);
  });
  for (const id of weddingImageLoadingOrder.pinturas) add(0, freeImages.find((image) => image.id === id)?.url);
  for (const id of weddingImageLoadingOrder.ramas) add(1, freeImages.find((image) => image.id === id)?.url);
  for (const section of sections) {
    if (section.tipo === "carrusel") for (const item of section.items ?? []) add(2, item.imagen);
  }
  for (const image of freeImages) add(3, image.url);
  return groups;
}

export function loadOriginalImage(src: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      image.src = "";
      reject(signal.reason);
    };
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => {
      void image.decode().then(() => {
        cleanup();
        resolve();
      }, (error: unknown) => {
        cleanup();
        reject(error);
      });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error(`No se pudo cargar la imagen: ${src}`));
    };
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = src;
  });
}

export async function loadImageGroups(
  groups: ImageLoadingGroup[],
  signal: AbortSignal,
  load: typeof loadOriginalImage,
  onLoaded: (src: string) => void,
  onFailed: (src: string, error: unknown) => void,
  onGroup: (name: string) => void,
) {
  for (const group of groups) {
    signal.throwIfAborted();
    onGroup(group.name);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(2, group.sources.length) }, async () => {
      while (next < group.sources.length) {
        signal.throwIfAborted();
        const src = group.sources[next++];
        try {
          await load(src, signal);
          signal.throwIfAborted();
          onLoaded(src);
        } catch (error) {
          if (signal.aborted) throw error;
          onFailed(src, error);
        }
      }
    }));
  }
  onGroup("complete");
}
