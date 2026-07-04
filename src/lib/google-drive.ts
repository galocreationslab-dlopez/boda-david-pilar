/**
 * lib/google-drive.ts
 * Utilidades mínimas para subir y borrar archivos en Google Drive usando una
 * cuenta de servicio.
 */

import crypto from "node:crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

type DriveAccessToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
};

type DriveListResponse = {
  files?: DriveFile[];
};

type DriveUploadInput = {
  folderId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  sharedDriveId?: string;
};

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getServiceAccountCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Faltan credenciales de Google Drive: GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  }

  return { clientEmail, privateKey };
}

function getOAuthRefreshCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, refreshToken };
}

async function getAccessTokenFromOAuthRefreshToken(): Promise<string> {
  const creds = getOAuthRefreshCredentials();
  if (!creds) {
    throw new Error("Faltan credenciales OAuth de Google Drive (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN)");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo obtener token OAuth de Google: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  const data = (await response.json()) as DriveAccessToken;
  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  // Si hay credenciales OAuth de usuario, las priorizamos para evitar problemas
  // de cuota al subir a carpetas en "Mi unidad".
  if (getOAuthRefreshCredentials()) {
    return getAccessTokenFromOAuthRefreshToken();
  }

  const { clientEmail, privateKey } = getServiceAccountCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive",
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claimSet}`);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${header}.${claimSet}.${base64UrlEncode(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (detail.includes("storageQuotaExceeded") || detail.includes("Service Accounts do not have storage quota")) {
      throw new Error(
        "La cuenta de servicio no tiene cuota de almacenamiento para subir en 'Mi unidad'. " +
        "Opciones: usar Shared Drive real o configurar OAuth de usuario (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN).",
      );
    }
    throw new Error(`No se pudo obtener token de Google: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  const data = (await response.json()) as DriveAccessToken;
  return data.access_token;
}

function buildDriveUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export async function uploadFileToDrive(input: DriveUploadInput): Promise<DriveFile> {
  const token = await getAccessToken();
  const boundary = `boundary-${crypto.randomUUID()}`;
  const metadata = {
    name: input.filename,
    parents: [input.folderId],
    mimeType: input.mimeType,
  };

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`),
    input.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const url = new URL(GOOGLE_DRIVE_UPLOAD_URL);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("supportsAllDrives", "true");
  if (input.sharedDriveId) {
    url.searchParams.set("driveId", input.sharedDriveId);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo subir a Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  const file = (await response.json()) as DriveFile;
  return file;
}

export async function ensureDriveSubfolder(input: {
  parentFolderId: string;
  folderName: string;
  sharedDriveId?: string;
}): Promise<string> {
  const token = await getAccessToken();
  const searchUrl = new URL(GOOGLE_DRIVE_FILES_URL);
  searchUrl.searchParams.set(
    "q",
    [
      `mimeType='application/vnd.google-apps.folder'`,
      `name='${input.folderName.replace(/'/g, "\\'")}'`,
      `'${input.parentFolderId}' in parents`,
      "trashed=false",
    ].join(" and "),
  );
  searchUrl.searchParams.set("fields", "files(id,name)");
  searchUrl.searchParams.set("supportsAllDrives", "true");
  searchUrl.searchParams.set("includeItemsFromAllDrives", "true");
  if (input.sharedDriveId) {
    searchUrl.searchParams.set("driveId", input.sharedDriveId);
    searchUrl.searchParams.set("corpora", "drive");
  }

  const searchResponse = await fetch(searchUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchResponse.ok) {
    const detail = await searchResponse.text().catch(() => "");
    throw new Error(`No se pudo consultar carpetas en Drive: ${searchResponse.status}${detail ? ` - ${detail}` : ""}`);
  }

  const listed = (await searchResponse.json()) as DriveListResponse;
  const existing = listed.files?.[0];
  if (existing?.id) {
    return existing.id;
  }

  const createUrl = new URL(GOOGLE_DRIVE_FILES_URL);
  createUrl.searchParams.set("supportsAllDrives", "true");
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [input.parentFolderId],
    }),
  });

  if (!createResponse.ok) {
    const detail = await createResponse.text().catch(() => "");
    throw new Error(`No se pudo crear subcarpeta en Drive: ${createResponse.status}${detail ? ` - ${detail}` : ""}`);
  }

  const created = (await createResponse.json()) as DriveFile;
  if (!created.id) {
    throw new Error("Drive no devolvió el id de la subcarpeta creada");
  }

  return created.id;
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`No se pudo borrar el archivo de Drive: ${response.status}`);
  }
}

export async function makeDriveFilePublic(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
      allowFileDiscovery: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo hacer público el archivo en Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }
}

export function driveFilePublicUrl(fileId: string): string {
  return buildDriveUrl(fileId);
}
