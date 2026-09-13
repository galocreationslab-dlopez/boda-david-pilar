/**
 * lib/google-drive.ts
 * Utilidades mínimas para subir y borrar archivos en Google Drive usando una
 * cuenta de servicio.
 */

import crypto from "node:crypto";
import { createServerClient } from "@/lib/supabase/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_DRIVE_OAUTH_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_DRIVE_TOKEN_ROW_ID = 1;
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
  parents?: string[];
  driveId?: string;
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

function getOAuthClientCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("google_drive_oauth_tokens")
      .select("refresh_token")
      .eq("id", GOOGLE_DRIVE_TOKEN_ROW_ID)
      .maybeSingle();
    return data?.refresh_token ?? null;
  } catch {
    return null;
  }
}

async function markOAuthTokenHealth(ok: boolean, error?: string): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase
      .from("google_drive_oauth_tokens")
      .update(
        ok
          ? { last_verified_at: new Date().toISOString(), last_error: null }
          : { last_error: error ?? "Error desconocido" },
      )
      .eq("id", GOOGLE_DRIVE_TOKEN_ROW_ID);
  } catch {
    // La tabla puede no existir todavía (antes de aplicar la migración); no es crítico.
  }
}

async function getOAuthRefreshCredentials() {
  const clientCreds = getOAuthClientCredentials();
  if (!clientCreds) return null;

  const refreshToken = (await getStoredRefreshToken()) ?? process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) return null;

  return { ...clientCreds, refreshToken };
}

async function getAccessTokenFromOAuthRefreshToken(): Promise<string> {
  const creds = await getOAuthRefreshCredentials();
  if (!creds) {
    throw new Error("Faltan credenciales OAuth de Google Drive (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / refresh token)");
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
    const message = `No se pudo obtener token OAuth de Google: ${response.status}${detail ? ` - ${detail}` : ""}`;
    await markOAuthTokenHealth(false, message);
    throw new Error(message);
  }

  await markOAuthTokenHealth(true);
  const data = (await response.json()) as DriveAccessToken;
  return data.access_token;
}

/**
 * Construye la URL de consentimiento de Google para (re)conectar Drive.
 * access_type=offline + prompt=consent fuerza la emisión de un refresh_token nuevo.
 */
export function buildGoogleDriveOAuthUrl(redirectUri: string, state: string): string {
  const creds = getOAuthClientCredentials();
  if (!creds) {
    throw new Error("Faltan GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET en el entorno");
  }
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_DRIVE_OAUTH_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Intercambia el código devuelto por Google por un refresh_token y lo guarda
 * en Supabase para que la conexión sobreviva a redeploys.
 */
export async function exchangeGoogleDriveOAuthCode(code: string, redirectUri: string): Promise<void> {
  const creds = getOAuthClientCredentials();
  if (!creds) {
    throw new Error("Faltan GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET en el entorno");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo canjear el código OAuth de Google: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  const data = (await response.json()) as DriveAccessToken & { refresh_token?: string };
  if (!data.refresh_token) {
    throw new Error(
      "Google no devolvió un refresh_token. Revoca el acceso previo en https://myaccount.google.com/permissions y vuelve a intentarlo (prompt=consent ya está forzado).",
    );
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("google_drive_oauth_tokens").upsert({
    id: GOOGLE_DRIVE_TOKEN_ROW_ID,
    refresh_token: data.refresh_token,
    access_token: data.access_token ?? null,
    access_token_expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    last_verified_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`No se pudo guardar el refresh_token en la base de datos: ${error.message}`);
  }
}

export type GoogleDriveConnectionStatus = {
  configured: boolean;
  hasStoredToken: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
};

export async function getGoogleDriveConnectionStatus(): Promise<GoogleDriveConnectionStatus> {
  const configured = Boolean(getOAuthClientCredentials());
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("google_drive_oauth_tokens")
      .select("refresh_token, last_verified_at, last_error")
      .eq("id", GOOGLE_DRIVE_TOKEN_ROW_ID)
      .maybeSingle();

    return {
      configured,
      hasStoredToken: Boolean(data?.refresh_token) || Boolean(process.env.GOOGLE_OAUTH_REFRESH_TOKEN),
      lastVerifiedAt: data?.last_verified_at ?? null,
      lastError: data?.last_error ?? null,
    };
  } catch {
    return {
      configured,
      hasStoredToken: Boolean(process.env.GOOGLE_OAUTH_REFRESH_TOKEN),
      lastVerifiedAt: null,
      lastError: null,
    };
  }
}

async function getAccessTokenFromServiceAccount(): Promise<string> {
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

async function getAccessToken(): Promise<string> {
  // Si hay credenciales OAuth de usuario, las priorizamos para evitar problemas
  // de cuota al subir a carpetas en "Mi unidad". Si el refresh token expira o
  // queda revocado, caemos a la cuenta de servicio para no romper operaciones
  // de lectura/escritura ya accesibles para esa identidad.
  if (await getOAuthRefreshCredentials()) {
    try {
      return await getAccessTokenFromOAuthRefreshToken();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const canFallback = /invalid_grant|invalid_client|unauthorized_client/i.test(message);
      if (!canFallback) {
        throw error;
      }
    }
  }

  return getAccessTokenFromServiceAccount();
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
    if (detail.includes("storageQuotaExceeded") || detail.includes("Service Accounts do not have storage quota")) {
      throw new Error(
        "No se pudo subir el archivo: la cuenta de servicio de Google no tiene cuota en 'Mi unidad'. " +
        "Configura un Shared Drive (sharedDriveId) para esta carpeta o renueva las credenciales OAuth de usuario.",
      );
    }
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

/** Lista las subcarpetas directas (no recursivo) de una carpeta de Drive. */
export async function listDriveSubfolders(input: {
  parentFolderId: string;
  sharedDriveId?: string;
}): Promise<DriveFile[]> {
  const token = await getAccessToken();
  const url = new URL(GOOGLE_DRIVE_FILES_URL);
  url.searchParams.set(
    "q",
    [
      `mimeType='application/vnd.google-apps.folder'`,
      `'${input.parentFolderId}' in parents`,
      "trashed=false",
    ].join(" and "),
  );
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  if (input.sharedDriveId) {
    url.searchParams.set("driveId", input.sharedDriveId);
    url.searchParams.set("corpora", "drive");
  }

  const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo listar subcarpetas en Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }
  const listed = (await response.json()) as DriveListResponse;
  return listed.files ?? [];
}

function isImageFile(file: DriveFile): boolean {
  if (file.mimeType?.startsWith("image/")) return true;
  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name ?? "");
}

/** Lista los archivos gráficos dentro de una carpeta de Drive (no incluye subcarpetas). */
export async function listDriveImageFiles(input: {
  folderId: string;
  sharedDriveId?: string;
}): Promise<DriveFile[]> {
  const token = await getAccessToken();
  const url = new URL(GOOGLE_DRIVE_FILES_URL);
  url.searchParams.set(
    "q",
    [
      `'${input.folderId}' in parents`,
      "trashed=false",
    ].join(" and "),
  );
  url.searchParams.set("fields", "files(id,name,mimeType,size,parents)");
  url.searchParams.set("orderBy", "name_natural");
  url.searchParams.set("pageSize", "200");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  if (input.sharedDriveId) {
    url.searchParams.set("driveId", input.sharedDriveId);
    url.searchParams.set("corpora", "drive");
  }

  const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo listar imágenes en Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }
  const listed = (await response.json()) as DriveListResponse;
  return (listed.files ?? []).filter(isImageFile);
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

export async function downloadDriveFile(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const token = await getAccessToken();
  const response = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo descargar el archivo de Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  const arr = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arr),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

export async function getDriveFileMetadata(fileId: string): Promise<DriveFile> {
  const token = await getAccessToken();
  const url = new URL(`${GOOGLE_DRIVE_FILES_URL}/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,parents,driveId,size");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo consultar metadatos del archivo de Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }

  return (await response.json()) as DriveFile;
}

export async function listDriveFilesForFolder(input: {
  folderId: string;
  sharedDriveId?: string;
}): Promise<DriveFile[]> {
  const token = await getAccessToken();
  const url = new URL(GOOGLE_DRIVE_FILES_URL);
  url.searchParams.set(
    "q",
    [
      `'${input.folderId}' in parents`,
      "trashed=false",
    ].join(" and "),
  );
  url.searchParams.set("fields", "files(id,name,mimeType,size,parents)");
  url.searchParams.set("pageSize", "500");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  if (input.sharedDriveId) {
    url.searchParams.set("driveId", input.sharedDriveId);
    url.searchParams.set("corpora", "drive");
  }

  const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`No se pudo listar archivos en Drive: ${response.status}${detail ? ` - ${detail}` : ""}`);
  }
  const listed = (await response.json()) as DriveListResponse;
  return listed.files ?? [];
}

export function driveFilePublicUrl(fileId: string): string {
  return buildDriveUrl(fileId);
}
