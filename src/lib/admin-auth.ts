/**
 * lib/admin-auth.ts
 * Utilidad de validación de acceso administrador.
 * Solo usar en Server Components o Route Handlers.
 */

import { createServerClient } from "@/lib/supabase/server";

export async function validateAdminCode(inviteCode: string): Promise<boolean> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("invitaciones")
      .select("tipo_invitacion")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    return data?.tipo_invitacion === "admin";
  } catch {
    return false;
  }
}
