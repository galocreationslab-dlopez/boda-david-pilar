import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { BlobNotFoundError, del, head, put } from "@vercel/blob";
import type { WeddingConfig } from "@/config/wedding.config";
import { createServerClient } from "@/lib/supabase/server";
import { getDriveFileMetadata, streamDriveFile } from "@/lib/google-drive";
import {
  isPublicBlobUrl, resolvePublishedResources, resourceVersion, selectedResources,
  type PublicationItem, type ResourceMetadata,
} from "@/lib/resource-publication";

type PublicationRow = {
  drive_file_id: string;
  name: string;
  source_version: string | null;
  blob_url: string | null;
  bytes: number | null;
  sha256: string | null;
  last_error: string | null;
  lease_expires_at: string | null;
};

export class ResourcePublicationError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

function databaseError(error: { code?: string; message: string }): ResourcePublicationError {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new ResourcePublicationError("Falta aplicar la migracion 20261010_resource_publications.sql en Supabase.", 503);
  }
  return new ResourcePublicationError(`No se pudo guardar o consultar la publicacion: ${error.message}`);
}

async function publicationContext(config: WeddingConfig) {
  const supabase = createServerClient();
  const { data: wedding, error } = await supabase.from("bodas").select("id").eq("slug", config.slug).maybeSingle();
  if (error) throw databaseError(error);
  if (!wedding) throw new ResourcePublicationError("Boda no encontrada", 404);
  const { data: rows, error: rowsError } = await supabase.from("resource_publications")
    .select("drive_file_id,name,source_version,blob_url,bytes,sha256,last_error,lease_expires_at")
    .eq("wedding_id", wedding.id);
  if (rowsError) throw databaseError(rowsError);
  return { supabase, weddingId: String(wedding.id), rows: (rows ?? []) as PublicationRow[] };
}

function publicationItem(fileId: string, source: string, row?: PublicationRow): PublicationItem {
  const uploading = row?.lease_expires_at && Date.parse(row.lease_expires_at) > Date.now();
  return {
    fileId, source, name: row?.name || fileId,
    status: uploading ? "uploading" : row?.last_error ? "error" : row?.blob_url ? "published" : "pending",
    error: row?.last_error ?? null, publishedUrl: row?.blob_url ?? null,
  };
}

async function* chunks(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let finished = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) { finished = true; return; }
      yield chunk.value;
    }
  } finally {
    if (!finished) await reader.cancel().catch((error: unknown) => {
      console.error("[resource-publication] No se pudo cancelar una transferencia", error);
    });
    reader.releaseLock();
  }
}

export async function listResourcePublications(config: WeddingConfig): Promise<PublicationItem[]> {
  const { rows } = await publicationContext(config);
  const byId = new Map(rows.map((row) => [row.drive_file_id, row]));
  return selectedResources(config).map(({ fileId, source }) => publicationItem(fileId, source, byId.get(fileId)));
}

let migrationWarningShown = false;
export async function withPublishedResources(config: WeddingConfig): Promise<WeddingConfig> {
  if (selectedResources(config).length === 0) return config;
  try {
    const { rows } = await publicationContext(config);
    const urls = new Map(rows.filter((row) => row.blob_url && row.sha256 && isPublicBlobUrl(row.blob_url))
      .map((row) => [row.drive_file_id, row.blob_url!]));
    return resolvePublishedResources(config, urls);
  } catch (error) {
    // Deploys can precede the migration. Keep the existing public site available and report the cause.
    if (error instanceof ResourcePublicationError && error.status === 503) {
      if (!migrationWarningShown) {
        console.warn("[resource-publication]", error.message);
        migrationWarningShown = true;
      }
      return config;
    }
    console.error("[resource-publication] No se pudieron resolver las copias publicadas", error);
    throw error;
  }
}

/** Hash while streaming: no artwork re-encoding and no full-size buffer in the function. */
export async function uploadVerifiedOriginal(
  weddingId: string, fileId: string, metadata: ResourceMetadata, signal: AbortSignal,
): Promise<{ url: string; bytes: number; sha256: string }> {
  const version = resourceVersion(metadata);
  const stream = await streamDriveFile(fileId, signal);
  const md5 = createHash("md5");
  const sha256 = createHash("sha256");
  let bytes = 0;
  let uploadedUrl: string | undefined;
  const original = Readable.from((async function* () {
    for await (const chunk of chunks(stream)) {
      signal.throwIfAborted();
      bytes += chunk.length;
      if (bytes > Number(metadata.size)) throw new Error("El original ha cambiado de tamano durante la descarga.");
      md5.update(chunk);
      sha256.update(chunk);
      yield chunk;
    }
  })());
  try {
    const extension = metadata.name.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
    const versionKey = createHash("sha256").update(version).digest("hex").slice(0, 24);
    const blob = await put(`weddings/${weddingId}/resources/${fileId}/${versionKey}${extension}`, original, {
      access: "public", addRandomSuffix: true, contentType: metadata.mimeType,
      cacheControlMaxAge: 31536000, multipart: true, abortSignal: signal,
    });
    uploadedUrl = blob.url;
    if (!isPublicBlobUrl(blob.url)) throw new Error("El almacenamiento debe ser Vercel Blob publico.");
    if (bytes !== Number(metadata.size) || md5.digest("hex") !== metadata.md5Checksum?.toLowerCase()) {
      throw new Error("La copia descargada no coincide con el original de Drive.");
    }
    const digest = sha256.digest("hex");
    const check = await fetch(blob.url, { cache: "no-store", signal, redirect: "error" });
    if (!check.ok || !check.body) throw new Error(`No se pudo verificar la copia publicada: ${check.status}`);
    const uploadedHash = createHash("sha256");
    let uploadedBytes = 0;
    for await (const chunk of chunks(check.body)) {
      uploadedBytes += chunk.length;
      if (uploadedBytes > bytes) throw new Error("La copia publicada tiene un tamano incorrecto.");
      uploadedHash.update(chunk);
    }
    if (uploadedBytes !== bytes || uploadedHash.digest("hex") !== digest) {
      throw new Error("La copia publicada no conserva exactamente los bytes del original.");
    }
    if (resourceVersion(await getDriveFileMetadata(fileId, signal)) !== version) {
      throw new Error("El archivo de Drive cambio durante la publicacion. Vuelve a intentarlo.");
    }
    return { url: blob.url, bytes, sha256: digest };
  } catch (error) {
    if (uploadedUrl) {
      await del(uploadedUrl).catch((cleanupError: unknown) => {
        console.error("[resource-publication] No se pudo eliminar una copia fallida", cleanupError);
      });
    }
    throw error;
  } finally {
    original.destroy();
  }
}

export async function publishResource(config: WeddingConfig, fileId: string): Promise<{ item: PublicationItem; reused: boolean }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ResourcePublicationError("Conecta un almacen Vercel Blob publico y configura BLOB_READ_WRITE_TOKEN en el servidor.", 503);
  }
  const selected = selectedResources(config).find((item) => item.fileId === fileId);
  if (!selected) throw new ResourcePublicationError("El recurso no pertenece al contenido guardado.", 400);
  const { supabase, weddingId } = await publicationContext(config);
  const lease = randomUUID();
  const { data: claimed, error: claimError } = await supabase.rpc("claim_resource_publication", {
    p_wedding_id: weddingId, p_drive_file_id: fileId, p_lease_token: lease,
  });
  if (claimError) throw databaseError(claimError);
  if (!claimed) throw new ResourcePublicationError("Este recurso ya se esta publicando. Reintenta cuando termine.", 409);
  const signal = AbortSignal.timeout(270_000);
  let newCopy: string | undefined;
  try {
    const metadata = await getDriveFileMetadata(fileId, signal);
    const version = resourceVersion(metadata);
    const { data: existing, error: existingError } = await supabase.from("resource_publications")
      .select("drive_file_id,name,source_version,blob_url,bytes,sha256,last_error,lease_expires_at")
      .eq("wedding_id", weddingId).eq("drive_file_id", fileId).maybeSingle();
    if (existingError) throw databaseError(existingError);
    let copy: { url: string; bytes: number; sha256: string };
    let reused = false;
    if (existing?.source_version === version && existing.blob_url && existing.sha256 &&
      isPublicBlobUrl(existing.blob_url) && existing.bytes === Number(metadata.size)) {
      try {
        const blob = await head(existing.blob_url, { abortSignal: signal });
        reused = blob.size === existing.bytes;
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error;
        console.warn("[resource-publication] La copia anterior ya no existe; se publicara de nuevo", fileId);
      }
    }
    if (reused && existing?.blob_url && existing.bytes && existing.sha256) {
      copy = { url: existing.blob_url, bytes: existing.bytes, sha256: existing.sha256 };
    } else {
      copy = await uploadVerifiedOriginal(weddingId, fileId, metadata, signal);
      newCopy = copy.url;
    }
    const { data: updated, error } = await supabase.from("resource_publications").update({
      name: metadata.name, source_version: version, blob_url: copy.url, bytes: copy.bytes, sha256: copy.sha256,
      published_at: new Date().toISOString(), last_error: null, lease_token: null, lease_expires_at: null,
    }).eq("wedding_id", weddingId).eq("drive_file_id", fileId).eq("lease_token", lease)
      .select("drive_file_id,name,source_version,blob_url,bytes,sha256,last_error,lease_expires_at").maybeSingle();
    if (error) throw databaseError(error);
    if (!updated) throw new ResourcePublicationError("La publicacion perdio su bloqueo. Vuelve a intentarlo.", 409);
    return { item: publicationItem(fileId, selected.source, updated as PublicationRow), reused };
  } catch (error) {
    if (newCopy) {
      // A lost DB response can hide a successful commit. Never delete a potentially active URL.
      const { data: current, error: readError } = await supabase.from("resource_publications")
        .select("blob_url").eq("wedding_id", weddingId).eq("drive_file_id", fileId).maybeSingle();
      if (readError) console.error("[resource-publication] No se pudo comprobar si la copia quedo registrada; se conserva", readError);
      else if (current?.blob_url !== newCopy) await del(newCopy).catch((cleanupError: unknown) => {
        console.error("[resource-publication] No se pudo eliminar una copia sin registrar", cleanupError);
      });
    }
    const message = error instanceof Error ? error.message : "No se pudo publicar el recurso.";
    const { error: updateError } = await supabase.from("resource_publications").update({
      last_error: message, lease_token: null, lease_expires_at: null,
    }).eq("wedding_id", weddingId).eq("drive_file_id", fileId).eq("lease_token", lease);
    if (updateError) console.error("[resource-publication] No se pudo registrar el fallo", updateError);
    throw error;
  }
}
