/**
 * app/api/admin/[inviteCode]/config/route.ts
 * GET: devuelve la configuración actual (merged default + BD).
 * POST: guarda el patch de configuración en bodas.config_json.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { weddingConfig } from "@/config/wedding.config";
import { normalizeMapsConfig } from "@/lib/portada-libre";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  source: unknown,
): Record<string, unknown> {
  if (!isRecord(source)) return target;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val === null || val === undefined) continue;

    if (Array.isArray(val)) {
      result[key] = val;
      continue;
    }

    if (isRecord(val)) {
      const current = isRecord(target[key]) ? target[key] : {};
      result[key] = deepMerge(current, val);
      continue;
    }

    result[key] = val;
  }

  return result;
}

type SectionSeedOptions = {
  bodaId: string;
  key: "historia" | "timeline";
  tipoSlug: "historia_lista" | "timeline_lista";
  title: string;
  subtitle: string;
  order: number;
  items: unknown[];
};

async function syncSectionItems(
  supabase: ReturnType<typeof createServerClient>,
  options: SectionSeedOptions,
) {
  const { data: tipo, error: tipoError } = await supabase
    .from("tipos_seccion")
    .select("id")
    .eq("slug", options.tipoSlug)
    .maybeSingle();

  if (tipoError || !tipo?.id) return;

  const { data: section, error: sectionError } = await supabase
    .from("bodas_secciones")
    .upsert(
      {
        boda_id: options.bodaId,
        tipo_seccion_id: tipo.id,
        clave_config: options.key,
        titulo: options.title,
        subtitulo: options.subtitle,
        idioma: "es",
        orden: options.order,
        visible: true,
        audiencia_roles: ["*"],
      },
      { onConflict: "boda_id,clave_config,idioma" },
    )
    .select("id")
    .single();

  if (sectionError || !section?.id) return;

  await supabase
    .from("secciones_items")
    .delete()
    .eq("seccion_id", section.id);

  if (options.items.length === 0) return;

  const rows = options.items.map((item, index) => ({
    seccion_id: section.id,
    orden: index + 1,
    visible: true,
    payload: isRecord(item) ? item : {},
  }));

  await supabase.from("secciones_items").insert(rows);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const config = await getWeddingConfig();
  return NextResponse.json({ config });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const mapsError = normalizeMapsConfig(body);
  if (mapsError) return NextResponse.json({ error: mapsError }, { status: 400 });
  if (isRecord(body) && isRecord(body.diseno)) {
    const design = body.diseno;
    const margins = design.margenesPc;
    if (margins !== undefined && (
      !isRecord(margins) ||
      ["izquierdo", "derecho"].some((key) => {
        const value = margins[key];
        return typeof value !== "number" || !Number.isFinite(value) || value < 0;
      })
    )) {
      return NextResponse.json({ error: "Los margenes de PC deben ser numeros finitos en px, mayores o iguales a cero." }, { status: 400 });
    }
    if (design.fondoPaginaColor !== undefined && (
      typeof design.fondoPaginaColor !== "string" || (design.fondoPaginaColor !== "" && !/^#[0-9a-f]{6}$/i.test(design.fondoPaginaColor))
    )) {
      return NextResponse.json({ error: "El color de fondo debe estar vacio o tener formato #RRGGBB." }, { status: 400 });
    }
    if (design.fondoPaginaImagen !== undefined && typeof design.fondoPaginaImagen !== "string") {
      return NextResponse.json({ error: "La textura de fondo debe ser una URL o ruta de imagen." }, { status: 400 });
    }
    if (design.fondoPaginaTexturaTamanoPx !== undefined && (
      typeof design.fondoPaginaTexturaTamanoPx !== "number" || !Number.isFinite(design.fondoPaginaTexturaTamanoPx) || design.fondoPaginaTexturaTamanoPx < 0
    )) {
      return NextResponse.json({ error: "El tamano de textura debe ser un numero finito en px, mayor o igual a cero." }, { status: 400 });
    }
  }
  const supabase = createServerClient();

  // Obtener config_json existente
  const { data: boda } = await supabase
    .from("bodas")
    .select("id, config_json")
    .eq("slug", weddingConfig.slug)
    .maybeSingle();

  if (!boda) {
    return NextResponse.json({ error: "Boda no encontrada" }, { status: 404 });
  }

  const existing = isRecord(boda.config_json) ? boda.config_json : {};
  const newConfigJson = deepMerge(existing, body);

  const { error } = await supabase
    .from("bodas")
    .update({ config_json: newConfigJson })
    .eq("id", boda.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sincroniza secciones en tablas nuevas (si ya existen) sin romper compatibilidad.
  try {
    if (isRecord(body)) {
      if (Array.isArray(body.historia)) {
        await syncSectionItems(supabase, {
          bodaId: boda.id,
          key: "historia",
          tipoSlug: "historia_lista",
          title: "Nuestra historia",
          subtitle: "El camino hasta aqui",
          order: 20,
          items: body.historia,
        });
      }

      if (Array.isArray(body.timeline)) {
        await syncSectionItems(supabase, {
          bodaId: boda.id,
          key: "timeline",
          tipoSlug: "timeline_lista",
          title: "El gran dia",
          subtitle: "Cronologia del evento",
          order: 30,
          items: body.timeline,
        });
      }
    }
  } catch {
    // Mantener guardado funcional aunque la migracion no se haya aplicado aun.
  }

  // Refresca cache de App Router para que la web publica muestre cambios al recargar.
  revalidatePath("/", "layout");
  revalidatePath("/", "page");
  revalidatePath("/[inviteCode]", "page");
  revalidatePath("/rsvp", "page");
  revalidatePath("/rsvp/[inviteCode]", "page");

  return NextResponse.json({ ok: true });
}
