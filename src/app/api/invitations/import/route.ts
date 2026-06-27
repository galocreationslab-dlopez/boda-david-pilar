import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type ImportRow = Record<string, string>;
type PersonaImport = { nombre: string; tipo_persona: "adulto" | "adolescente" | "nino" | "bebe"; edad?: number | null };

type InvitacionInsertada = { invite_code: string; nombre_visible: string };

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvText(csvText: string) {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [] as ImportRow[];
  }

  const sample = lines[0];
  const delimiter = sample.includes(";") && !sample.includes(",") ? ";" : ",";
  const [headerLine, ...rowLines] = lines;
  const headers = parseCsvLine(headerLine, delimiter).map(normalizeHeader);

  return rowLines.map((rowLine) => {
    const values = parseCsvLine(rowLine, delimiter);
    const row = {} as ImportRow;
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function toNumber(value: string | undefined) {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: string | undefined) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function inferTipoInvitacion(adultos: number, explicit?: string) {
  const normalized = (explicit || "").trim().toLowerCase();
  if (normalized.includes("pareja")) return "pareja";
  if (normalized.includes("solter") || normalized.includes("individual")) return "soltero";
  if (adultos >= 2) return "pareja";
  if (adultos === 1) return "soltero";
  return "otro";
}

async function resolveUniqueInviteCode(supabase: ReturnType<typeof createServerClient>, nombreVisible: string) {
  const base = (nombreVisible || "invitacion")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 12) || "invitacion";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt}`;
    const candidate = `${base}${suffix}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: existing, error } = await supabase.from("invitaciones").select("id").eq("invite_code", candidate).maybeSingle();

    if (!error && !existing) {
      return candidate;
    }
  }

  return `inv-${Math.random().toString(36).slice(2, 10)}`;
}

function buildPersonasJson(nombreVisible: string, adultos: number, adolescentes: number, ninos: number, bebes: number, row: ImportRow) {
  const personas: PersonaImport[] = [];

  for (let index = 0; index < adultos; index += 1) {
    personas.push({
      nombre: adultos === 1 ? nombreVisible : `${nombreVisible} - Adulto ${index + 1}`,
      tipo_persona: "adulto",
    });
  }

  for (let index = 0; index < adolescentes; index += 1) {
    personas.push({
      nombre: adolescentes === 1 ? `${nombreVisible} - Adolescente` : `${nombreVisible} - Adolescente ${index + 1}`,
      tipo_persona: "adolescente",
    });
  }

  for (let index = 0; index < ninos; index += 1) {
    const ageValue = toOptionalNumber(row[`edad_nino_${index + 1}`] || row[`edad_${index + 1}`]);
    personas.push({
      nombre: ninos === 1 ? `${nombreVisible} - Niño` : `${nombreVisible} - Niño ${index + 1}`,
      tipo_persona: "nino",
      edad: ageValue,
    });
  }

  for (let index = 0; index < bebes; index += 1) {
    personas.push({
      nombre: bebes === 1 ? `${nombreVisible} - Bebé` : `${nombreVisible} - Bebé ${index + 1}`,
      tipo_persona: "bebe",
    });
  }

  return personas;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    const parsedRows = Array.isArray(body.rows)
      ? body.rows
      : typeof body.csvText === "string"
        ? parseCsvText(body.csvText)
        : [];

    if (!parsedRows.length) {
      return NextResponse.json({ error: "No hay filas para importar" }, { status: 400 });
    }

    const { data: bodaData, error: bodaError } = await supabase
      .from("bodas")
      .select("id")
      .eq("slug", body.weddingSlug || "pilar-y-david")
      .maybeSingle();

    if (bodaError || !bodaData) {
      return NextResponse.json({ error: "No se encontró la boda configurada" }, { status: 404 });
    }

    const created = [] as InvitacionInsertada[];

    for (const [index, row] of parsedRows.entries()) {
      const nombreVisible =
        row.nombre_visible ||
        row.nombre ||
        row.invitados ||
        row.name ||
        `Invitación ${index + 1}`;
      const adultos = toNumber(row.adultos || row.adultos_estimados || row.adultos_numero || row.adultos_count);
      const adolescentes = toNumber(row.adolescentes || row.adolescentes_estimados || row.adolescentes_numero || row.adolescentes_count);
      const ninos = toNumber(row.ninos || row.ninos_estimados || row.ninos_numero || row.ninos_count);
      const bebes = toNumber(row.bebes || row.bebes_estimados || row.bebes_numero || row.bebes_count);
      const personas = buildPersonasJson(nombreVisible, adultos, adolescentes, ninos, bebes, row);
      const tipoInvitacion = inferTipoInvitacion(adultos, row.tipo_invitacion || row.tipo || row.invitation_type);
      const inviteCode = await resolveUniqueInviteCode(supabase, nombreVisible);

      const { data: invitacionData, error: invitacionError } = await supabase
        .from("invitaciones")
        .insert({
          wedding_id: bodaData.id,
          invite_code: inviteCode,
          nombre_visible: nombreVisible,
          tipo_invitacion: tipoInvitacion,
          personas_json: personas,
          adultos_estimados: adultos,
          adolescentes_estimados: adolescentes,
          ninos_estimados: ninos,
          bebes_estimados: bebes,
          estado: "pendiente",
          metadata: {
            origen: "importacion",
            fuente: body.source || "manual",
            fuente_fila: index + 1,
          },
        })
        .select("id, invite_code, nombre_visible")
        .single();

      if (invitacionError || !invitacionData) {
        continue;
      }

      created.push({ invite_code: invitacionData.invite_code, nombre_visible: invitacionData.nombre_visible });
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
