/**
 * lib/supabase/server.ts
 * ─────────────────────────────────────────────────────────────
 * Cliente de Supabase para uso en el servidor (API routes, Server Components).
 * Usa la SERVICE_ROLE_KEY para operaciones con permisos elevados.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Crea un cliente con permisos de servicio.
 * NUNCA exponer este cliente al navegador.
 * Solo usar en rutas API y Server Components.
 */
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
