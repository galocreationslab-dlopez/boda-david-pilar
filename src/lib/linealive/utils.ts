import type { WeddingConfig } from "@/config/wedding.config";

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
    for (const item of section.items ?? []) {
      const fileId = item.lineAlive?.htmlDriveFileId?.trim();
      if (fileId) ids.add(fileId);
    }
  }

  return ids;
}