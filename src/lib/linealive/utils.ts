import type { WeddingConfig } from "@/config/wedding.config";

function extractDriveFileIdFromUrl(value?: string): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) {
    return raw;
  }

  try {
    const parsed = new URL(raw, "http://localhost");
    const fileIdFromQuery = parsed.searchParams.get("fileId")?.trim();
    if (fileIdFromQuery && /^[a-zA-Z0-9_-]{20,}$/.test(fileIdFromQuery)) {
      return fileIdFromQuery;
    }

    const idFromQuery = parsed.searchParams.get("id")?.trim();
    if (idFromQuery && /^[a-zA-Z0-9_-]{20,}$/.test(idFromQuery)) {
      return idFromQuery;
    }

    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (fileMatch?.[1]) {
      return fileMatch[1];
    }

    const genericMatch = parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/i);
    if (genericMatch?.[1]) {
      return genericMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

function parseNumericDimension(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function detectLineAliveAspectRatioFromHtml(html: string): number | undefined {
  const svgTag = html.match(/<svg\b[^>]*>/i)?.[0];
  if (!svgTag) return undefined;

  const viewBoxMatch = svgTag.match(/viewBox=["']([^"']+)["']/i)?.[1];
  if (viewBoxMatch) {
    const values = viewBoxMatch
      .trim()
      .split(/[\s,]+/)
      .map((token) => Number(token));
    if (values.length === 4 && Number.isFinite(values[2]) && Number.isFinite(values[3]) && values[2] > 0 && values[3] > 0) {
      return values[2] / values[3];
    }
  }

  const width = parseNumericDimension(svgTag.match(/width=["']([^"']+)["']/i)?.[1]);
  const height = parseNumericDimension(svgTag.match(/height=["']([^"']+)["']/i)?.[1]);
  if (width && height) {
    return width / height;
  }

  return undefined;
}

export function collectLineAliveHtmlDriveFileIds(config: WeddingConfig): Set<string> {
  const ids = new Set<string>();

  for (const item of config.historia) {
    const fileId = item.lineAlive?.htmlDriveFileId?.trim();
    if (fileId) ids.add(fileId);
  }

  for (const section of config.diseno?.secciones ?? []) {
    if (section.tipo === "intro" && section.intro) {
      const introCandidates = [
        section.intro.panelIzquierdoUrl,
        section.intro.panelDerechoUrl,
      ];
      for (const candidate of introCandidates) {
        const fileId = extractDriveFileIdFromUrl(candidate);
        if (fileId) ids.add(fileId);
      }
    }

    for (const item of section.items ?? []) {
      const fileId = item.lineAlive?.htmlDriveFileId?.trim();
      if (fileId) ids.add(fileId);
    }
  }

  return ids;
}