const IMAGE_FIELDS = new Set([
  "imagen", "imagenUrl", "heroImagen", "logo", "logoUrl", "texturaUrl", "selloUrl",
  "lacreUrl", "selloSecoUrl", "fondoExteriorImagenUrl", "panelIzquierdoUrl", "panelDerechoUrl", "mediaUrl",
]);
const INTRO_MODES = new Set(["revealBook", "cortinas", "fadeIn", "focusRegion", "slideUp", "custom", "envelope"]);

export type SelectedResource = { fileId: string; source: string };
export type PublicationItem = SelectedResource & {
  name: string;
  status: "pending" | "published" | "error" | "uploading";
  error: string | null;
  publishedUrl: string | null;
};

export type ResourceMetadata = {
  name: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  md5Checksum?: string;
};

export function resourceVersion(metadata: ResourceMetadata): string {
  if (!metadata.mimeType?.startsWith("image/") || !metadata.md5Checksum ||
    !/^[a-f0-9]{32}$/i.test(metadata.md5Checksum) || !metadata.modifiedTime ||
    !metadata.size || !Number.isSafeInteger(Number(metadata.size)) || Number(metadata.size) <= 0) {
    throw new Error("El recurso debe ser una imagen original de Drive con tamano y checksum verificables.");
  }
  return `${metadata.md5Checksum.toLowerCase()}:${metadata.size}:${metadata.modifiedTime}`;
}

export function resourceDriveId(source: string): string | null {
  const value = source.trim();
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin === "https://local.invalid" &&
      (url.pathname === "/api/resources/preview" || url.pathname === "/api/media/drive")) {
      const original = url.searchParams.get("src");
      if (original && original !== value) return resourceDriveId(original);
      const id = url.searchParams.get("fileId");
      return id && /^[\w-]+$/.test(id) ? id : null;
    }
    if (!["drive.google.com", "drive.usercontent.google.com", "drive.googleusercontent.com"].includes(url.hostname)) return null;
    const id = url.searchParams.get("id") ?? url.pathname.match(/\/(?:file\/)?d\/([\w-]+)/)?.[1];
    return id && /^[\w-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function visitMedia(value: unknown, replace: (source: string) => string, activeIntroOnly = false): void {
  if (Array.isArray(value)) {
    for (const child of value) visitMedia(child, replace, activeIntroOnly);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (activeIntroOnly && typeof record.tipo === "string" && INTRO_MODES.has(record.tipo) &&
      INTRO_MODES.has(key) && key !== record.tipo) continue;
    const isImage = IMAGE_FIELDS.has(key) || (key === "url" && record.tipo === "imagen");
    if (typeof child === "string" && isImage) record[key] = replace(child);
    else if (key === "fondos" && child && typeof child === "object" && !Array.isArray(child)) {
      const backgrounds = child as Record<string, unknown>;
      for (const role of ["seccion", "subseccion"]) {
        if (typeof backgrounds[role] === "string") backgrounds[role] = replace(backgrounds[role]);
      }
    } else visitMedia(child, replace, activeIntroOnly);
  }
}

export function selectedResources(config: unknown): SelectedResource[] {
  const resources = new Map<string, SelectedResource>();
  visitMedia(structuredClone(config), (source) => {
    const fileId = resourceDriveId(source);
    if (fileId && !resources.has(fileId)) resources.set(fileId, { fileId, source });
    return source;
  }, true);
  return [...resources.values()];
}

export function resolvePublishedResources<T>(config: T, urls: ReadonlyMap<string, string>): T {
  const resolved = structuredClone(config);
  visitMedia(resolved, (source) => {
    const id = resourceDriveId(source);
    return id ? urls.get(id) ?? source : source;
  });
  return resolved;
}

export function isPublicBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}
