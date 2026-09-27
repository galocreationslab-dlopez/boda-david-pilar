/** True if the url points to Google Drive (needs proxying, hotlinking is blocked/unreliable). */
export function isDriveUrl(value?: string | null): boolean {
  if (!value) return false;
  return value.includes("drive.google.com") || value.includes("drive.usercontent.google.com");
}

/** True if the url is already our own proxy endpoint (e.g. saved pre-resolved by the resources API). */
function isAlreadyProxied(value: string): boolean {
  return value.startsWith("/api/resources/preview") || value.startsWith("/api/media/drive");
}

/** Resolves a stored media url to something browsers can render, proxying Drive urls through our server. */
export function resolveDriveMediaSrc(src?: string | null): string {
  const value = src?.trim() ?? "";
  if (!value) return "";
  if (isAlreadyProxied(value) || !isDriveUrl(value)) return value;
  return `/api/resources/preview?src=${encodeURIComponent(value)}`;
}

