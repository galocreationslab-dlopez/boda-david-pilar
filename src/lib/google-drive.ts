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

async function getAccessToken(): Promise<string> {
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
    throw new Error(`No se pudo obtener token de Google: ${response.status}`);
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
    throw new Error(`No se pudo subir a Drive: ${response.status}`);
  }

  const file = (await response.json()) as DriveFile;
  return file;
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

export function driveFilePublicUrl(fileId: string): string {
  return buildDriveUrl(fileId);
}
