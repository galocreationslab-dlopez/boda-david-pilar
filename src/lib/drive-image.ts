/** True if the url points to Google Drive (needs proxying, hotlinking is blocked/unreliable). */
export function isDriveUrl(value?: string | null): boolean {
  if (!value) return false;
  return value.includes("drive.google.com") || value.includes("drive.usercontent.google.com");
}

/** Resolves a stored media url to something browsers can render, proxying Drive urls through our server. */
export function resolveDriveMediaSrc(src?: string | null): string {
  const value = src?.trim() ?? "";
  if (!value) return "";
  if (!isDriveUrl(value)) return value;
  return `/api/resources/preview?src=${encodeURIComponent(value)}`;
}
