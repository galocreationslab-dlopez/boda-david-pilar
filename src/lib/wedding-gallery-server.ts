import { unstable_noStore as noStore } from "next/cache";
import { weddingConfig } from "@/config/wedding.config";
import { createServerClient } from "@/lib/supabase/server";

export type PublicGalleryMedia = {
  id: string;
  nombre: string;
  tipo: "foto" | "video" | "audio";
  google_drive_id: string;
  url_publica: string | null;
  subido_por: string | null;
  created_at: string;
};

export async function getFeaturedGalleryMedia(): Promise<PublicGalleryMedia[]> {
  noStore();

  const supabase = createServerClient();
  const { data: boda } = await supabase
    .from("bodas")
    .select("id")
    .eq("slug", weddingConfig.slug)
    .maybeSingle();

  if (!boda?.id) return [];

  const { data, error } = await supabase
    .from("multimedia")
    .select("id, nombre, tipo, google_drive_id, url_publica, subido_por, created_at")
    .eq("wedding_id", boda.id)
    .eq("visible_public", true)
    .eq("featured", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PublicGalleryMedia[];
}