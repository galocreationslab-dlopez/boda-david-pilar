import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const source = async (file) => readFile(new URL(file, import.meta.url), "utf8");
const sizeUrl = moduleUrl(compile(await source("./component-size.ts")));
const configUrl = moduleUrl(compile(await source("../config/wedding.config.ts")));
const visualUrl = moduleUrl(compile((await source("./visual-versions.ts")).replace('from "@/lib/component-size"', `from "${sizeUrl}"`)));
const { weddingConfig } = await import(configUrl);
const { captureVisualSnapshot: capture, applyVisualSnapshot: apply, assertVisualSnapshot: validate, compareVisualSnapshots: compare, collectVisualResources: resources, mergeVisualIntoStoredConfig } = await import(visualUrl);

const stubs = {
  "@/lib/supabase/server": "export const createServerClient = () => globalThis.__visualDb;",
  "@/lib/theme-roles": "export const buildTextureCssVars = () => ({}); export const resolvePaletteRoleColors = () => ({}); export const resolvePaletteToThemeColors = () => ({});",
  "@/lib/drive-image": "export const resolveDriveMediaSrc = (v) => v;",
  "@/lib/theme-fonts": "export const buildFontCssVars = () => ({}); export const buildFontFaceCss = () => '';",
  "@/lib/timeline-logo-size": "export const normalizeAlineacionLogoTimeline = v => v; export const normalizeTamanoLogoTimeline = v => v;",
  "next/cache": "export const unstable_noStore = () => {}; export const revalidatePath = () => {};",
  "@/lib/section-chains": "export const normalizeSectionChains = v => v;",
  "next/server": "export const NextResponse = { json: (value, init) => Response.json(value, init) };",
  "@/lib/google-drive": "export const getDriveFileMetadata = async (id) => { if (id === 'missing') throw new Error('Drive: 404'); return { id }; };",
};
function substitute(text, modules) {
  for (const [name, url] of Object.entries(modules)) text = text.replaceAll(`from "${name}"`, `from "${url}"`);
  return text;
}
const modules = Object.fromEntries(Object.entries(stubs).map(([name, code]) => [name, moduleUrl(code)]));
modules["@/config/wedding.config"] = configUrl;
modules["@/lib/visual-versions"] = visualUrl;
const resolverUrl = moduleUrl(compile(substitute(await source("./wedding-config-server.ts"), modules)));
modules["@/lib/wedding-config-server"] = resolverUrl;
const serverUrl = moduleUrl(compile(substitute((await source("./visual-versions-server.ts")).replace('import "server-only";', ""), modules)));
modules["@/lib/visual-versions-server"] = serverUrl;
const { resolveWeddingConfig } = await import(resolverUrl);
const { inspectVisualResources } = await import(serverUrl);
const route = await import(moduleUrl(compile(substitute(await source("../app/api/admin/[inviteCode]/visual-versions/route.ts"), modules))));
const resetRoute = await import(moduleUrl(compile(substitute(await source("../app/api/admin/[inviteCode]/config/reset/route.ts"), modules))));
const params = { params: Promise.resolve({ inviteCode: "fixture-admin" }) };
test.beforeEach((context) => { context.mock.method(console, "error", () => {}); });

function fixture() {
  const config = structuredClone(weddingConfig);
  const device = {
    alturaModo: "aspecto", aspecto: 1.4, fondoModo: "paleta", fondoRol: "fondoSeccion",
    layout: {
      title: { x: 12, y: 30, w: 70, h: 15, z: 2, tamano: 32, fuenteRol: "titulos", colorModo: "paleta", colorRol: "titulo", opacidad: 80, negrita: true },
      photo: { x: 0, y: 0, w: 100, h: 100, ajuste: "cover", oculto: false, colorModo: "personalizado", colorHex: "#112233" },
    },
  };
  const free = {
    elementos: [{ id: "title", tipo: "texto", texto: "Content must survive", enlaceUrl: "https://example.com" }, { id: "photo", tipo: "imagen", url: "/images/Sello.svg" }],
    pc: structuredClone(device), movil: structuredClone(device),
  };
  const section = {
    id: "cover", tipo: "portadaLibre", nombre: "Cover", titulo: "Current content", selloUrl: "/images/Sello.svg", paletaId: config.tema.paletas?.[0]?.id ?? "palette",
    usarPaletaGlobal: true, visible: true, perfiles: ["publico"], items: [],
    componentRoles: { "portada.nombres": "titulo" }, componentFonts: { "portada.nombres": "nombres" },
    componentSizes: { "portada.nombres": 64, "portada.logo": 200 }, componentBorders: { "portada.logo": false },
    distanciaSiguiente: { pc: 140, movil: 30 }, portadaLibre: free,
  };
  config.diseno = {
    margenesPc: { izquierdo: 70, derecho: 100 }, fondoPaginaColor: "#112233",
    navegacion: { logoUrl: "/images/Sello.svg", logoColor: "#112233", textoColor: "#334455", textoTamanoPx: 22, logoAnchoPx: 120, texto: "Never restore text" },
    separador: { modo: "onda", grafico: "imagen", imagenUrl: "/images/Sello_animado_v4.2.svg", imagenMaxWidthPx: 100, tintMode: "paleta", imagenColorRole: "titulo" },
    tratamientosImagenes: { photo: { opacidadOverlay: 25, difuminadoBordePx: 5 } },
    secciones: [
      section, { ...structuredClone(section), id: "footer", tipo: "pie", portadaLibre: undefined, pie: structuredClone(free) },
      { ...structuredClone(section), id: "intro", tipo: "intro", portadaLibre: undefined,
        intro: { activo: true, repetir: "siempre", lacreUrl: "/images/Sello.svg", textoTitulo: "Keep title", tamanoLacrePorcentaje: 20,
          pc: { tipo: "envelope", envelope: { colorBase: "#abcdef", alturaSolapaPorcentaje: 55, margenPantallaPorcentaje: 10, colorTrasera: "#123456" } },
          movil: { tipo: "envelope", envelope: { colorBase: "#abcdef", alturaSolapaPorcentaje: 45 } },
        },
      },
    ],
  };
  return config;
}

function changed(config) {
  const next = structuredClone(config);
  next.tema.colores.bronze = "#987654";
  next.tema.fuentes.display = "Changed display";
  next.diseno.fondoPaginaColor = "#abcdef";
  next.diseno.secciones[0].componentRoles = {};
  next.diseno.secciones[0].componentFonts = {};
  next.diseno.secciones[0].componentBorders = {};
  next.diseno.secciones[0].componentSizes = { "portada.logo": 222 };
  delete next.diseno.secciones[0].portadaLibre.pc.layout.title.colorRol;
  next.diseno.secciones[0].portadaLibre.pc.layout.title.tamano = 60;
  next.diseno.secciones[1].pie.movil.layout.title.colorHex = "#ffeedd";
  next.diseno.secciones[2].intro.pc.envelope.colorBase = "#000000";
  return next;
}

test("snapshot is independent, versioned and excludes content and geometry at every surface", () => {
  const original = fixture();
  const snapshot = capture(original);
  validate(snapshot);
  assert.equal(snapshot.schema, "wedding-visual");
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.rolesModel, "legacy-v1");
  const serialized = JSON.stringify(snapshot);
  for (const forbidden of ["Content must survive", "Current content", "Never restore text", "alturaSolapaPorcentaje", "margenesPc", "distanciaSiguiente", '"x":', '"w":', "portada.logo\":200", "confirmacionLimite", "localizaciones"]) {
    assert.ok(!serialized.includes(forbidden), forbidden);
  }
    assert.equal(snapshot.design.navegacion.logoUrl, "/images/Sello.svg");
    assert.equal(snapshot.sections[0].style.selloUrl, "/images/Sello.svg");
    assert.equal(snapshot.design.separador.imagenUrl, "/images/Sello_animado_v4.2.svg");
    assert.equal(snapshot.sections[2].style.intro.lacreUrl, "/images/Sello.svg");
  original.tema.colores.bronze = "mutated";
  original.diseno.secciones[0].componentRoles["portada.nombres"] = "mutated";
  assert.notEqual(snapshot.theme.colores.bronze, "mutated");
  assert.equal(snapshot.sections[0].style.componentRoles["portada.nombres"], "titulo");
});

test("A -> B -> backup A roundtrip removes stale overrides and reproduces all visual fields", () => {
  const original = fixture();
  const snapshotA = JSON.parse(JSON.stringify(capture(original)));
  const snapshotB = JSON.parse(JSON.stringify(capture(changed(original))));
  const toB = apply(original, snapshotB).config;
  assert.deepEqual(capture(toB), snapshotB);
  assert.deepEqual(toB.diseno.secciones[0].componentRoles, {});
  assert.equal(toB.diseno.secciones[0].componentSizes["portada.logo"], 200);
  assert.equal(toB.diseno.secciones[2].intro.pc.envelope.alturaSolapaPorcentaje, 55);
  assert.equal(toB.diseno.secciones[2].intro.lacreUrl, "/images/Sello.svg");
  assert.equal(toB.diseno.margenesPc.izquierdo, 70);
  const recovered = apply(JSON.parse(JSON.stringify(toB)), snapshotA).config;
  assert.deepEqual(capture(recovered), snapshotA);
  assert.deepEqual(recovered, JSON.parse(JSON.stringify(original)));
  toB.diseno.secciones[0].componentRoles.test = "not shared";
  assert.equal(snapshotB.sections[0].style.componentRoles.test, undefined);
});

test("current content, guests settings and changed geometry survive applying older visual versions", () => {
  const original = fixture();
  const current = changed(original);
  current.fecha = "2030-01-01";
  current.rsvp = { mostrarChat: false, textos: { saludoPrefijo: "New greeting" } };
  current.diseno.secciones[0].titulo = "New title";
  current.diseno.secciones[0].portadaLibre.elementos[0].texto = "New content";
  current.diseno.secciones[0].portadaLibre.pc.layout.title.x = 91;
  current.diseno.secciones[0].portadaLibre.pc.aspecto = 2.8;
  current.diseno.secciones[2].intro.pc.envelope.alturaSolapaPorcentaje = 70;
  current.diseno.navegacion.logoAnchoPx = 300;
  const restored = apply(current, capture(original)).config;
  assert.equal(restored.fecha, current.fecha);
  assert.deepEqual(restored.rsvp, current.rsvp);
  assert.equal(restored.diseno.secciones[0].titulo, "New title");
  assert.equal(restored.diseno.secciones[0].portadaLibre.elementos[0].texto, "New content");
  assert.equal(restored.diseno.secciones[0].portadaLibre.pc.layout.title.x, 91);
  assert.equal(restored.diseno.secciones[0].portadaLibre.pc.aspecto, 2.8);
  assert.equal(restored.diseno.secciones[2].intro.pc.envelope.alturaSolapaPorcentaje, 70);
  assert.equal(restored.diseno.navegacion.logoAnchoPx, 300);
  assert.deepEqual(restored.historia, current.historia);
  assert.deepEqual(restored.timeline, current.timeline);
  assert.deepEqual(restored.drive, current.drive);
});

test("deleted sections/elements and changed section types are skipped with explicit warnings", () => {
  const original = fixture();
  const snapshot = capture(original);
  const current = structuredClone(original);
  current.diseno.secciones.pop();
  current.diseno.secciones[0].portadaLibre.elementos = [{ id: "photo", tipo: "imagen" }];
  delete current.diseno.secciones[0].portadaLibre.pc.layout.title;
  current.diseno.secciones[1].tipo = "historia";
  const { config, warnings } = apply(current, snapshot);
  assert.equal(config.diseno.secciones.length, 2);
  assert.equal(config.diseno.secciones[0].portadaLibre.elementos.length, 1);
  assert.ok(warnings.some((v) => v.includes("intro")));
  assert.ok(warnings.some((v) => v.includes("footer")));
  assert.ok(warnings.some((v) => v.includes("title")));
  assert.deepEqual(config.diseno.secciones[1], current.diseno.secciones[1]);
});

test("comparison ignores section order, exposes true changes, rejects content and unsupported schemas", () => {
  const snapshot = capture(fixture());
  const reordered = structuredClone(snapshot);
  reordered.sections.reverse();
  assert.deepEqual(compare(snapshot, reordered), []);
  assert.ok(compare(snapshot, capture(changed(fixture()))).some((v) => v.path.includes("componentSizes")));
  for (const mutate of [
    (s) => { s.schemaVersion = 2; },
    (s) => { s.rolesModel = "future-v2"; },
    (s) => { s.sections[0].style.items = []; },
    (s) => { s.sections[0].style.portadaLibre.pc.layout.title.x = 5; },
    (s) => { s.design.margenesPc = {}; },
    (s) => { s.sections[0].style.componentSizes["portada.logo"] = 50; },
    (s) => { s.sections[0].style.portadaLibre.pc.layout.title.tamano = "large"; },
    (s) => { s.theme.colores = {}; },
  ]) {
    const invalid = structuredClone(snapshot); mutate(invalid);
    assert.throws(() => validate(invalid), /invalida/);
  }
});

test("stored applied visual state survives default merging without resurrecting removed overrides", () => {
  const original = fixture();
  const toB = apply(resolveWeddingConfig(original), capture(changed(original))).config;
  const raw = JSON.parse(JSON.stringify({ ...original, tema: toB.tema, diseno: toB.diseno, visualSchema: "wedding-visual-v1" }));
  assert.deepEqual(capture(resolveWeddingConfig(raw)), capture(resolveWeddingConfig(toB)));
  const empty = structuredClone(raw);
  delete empty.diseno.fondoPaginaColor;
  assert.equal(resolveWeddingConfig(empty).diseno.fondoPaginaColor, undefined);
  raw.visualSnapshot = capture(toB);
  const withSnapshot = resolveWeddingConfig(raw);
  assert.deepEqual(capture(withSnapshot), capture(resolveWeddingConfig(toB)));
  assert.equal(withSnapshot.visualSnapshot, undefined);
  assert.equal(withSnapshot.visualSchema, undefined);
});

test("persistence changes only visual leaves, never normalizing stored content URLs or envelope geometry", () => {
  const raw = JSON.parse(JSON.stringify(fixture()));
  raw.diseno.secciones[0].portadaLibre.elementos[1].url = "images/Sello.svg";
  raw.diseno.secciones[2].intro.pc.envelope.alturaSolapaPorcentaje = 999;
  raw.diseno.futureContent = { untouched: "keep this" };
  const effective = resolveWeddingConfig(raw);
  const applied = apply(effective, capture(changed(effective))).config;
  const persisted = mergeVisualIntoStoredConfig(raw, applied);
  assert.deepEqual(persisted.diseno, raw.diseno);
  assert.deepEqual(persisted.tema, raw.tema);
  assert.deepEqual(persisted.textos, raw.textos);
  assert.deepEqual(persisted.historia, raw.historia);
  assert.deepEqual(persisted.rsvp, raw.rsvp);
  assert.equal(persisted.visualSnapshot.schema, "wedding-visual");
  assert.equal(persisted.diseno.secciones[0].portadaLibre.elementos[1].url, "images/Sello.svg");
  assert.equal(persisted.diseno.secciones[2].intro.pc.envelope.alturaSolapaPorcentaje, 999);
  assert.deepEqual(persisted.diseno.futureContent, raw.diseno.futureContent);
  assert.deepEqual(persisted.diseno.secciones[0].portadaLibre.elementos, raw.diseno.secciones[0].portadaLibre.elementos);
  assert.equal(persisted.diseno.secciones[0].portadaLibre.pc.layout.title.x, raw.diseno.secciones[0].portadaLibre.pc.layout.title.x);
  assert.deepEqual(capture(resolveWeddingConfig(persisted)), capture(resolveWeddingConfig(applied)));
});
test("resource references are unique; missing local/Drive assets and unchecked external assets are reported", async () => {
  const config = fixture();
  config.diseno.fondoPaginaImagen = "/images/visual-test-does-not-exist.png";
  config.tema.fuentes.biblioteca = [
    { id: "a", nombre: "A", familia: "A", formato: "woff2", url: "https://drive.google.com/file/d/missing/view" },
    { id: "b", nombre: "B", familia: "B", formato: "woff2", url: "https://example.com/font.woff2" },
  ];
  const snapshot = capture(config);
  assert.equal(resources(snapshot).filter((v) => v === "/images/visual-test-does-not-exist.png").length, 1);
  const issues = await inspectVisualResources(snapshot);
  assert.equal(issues.find((v) => v.reference.includes("does-not-exist")).status, "missing");
  assert.equal(issues.find((v) => v.reference.includes("/missing/")).status, "missing");
  assert.equal(issues.find((v) => v.reference.includes("example.com")).status, "unverified");
});

function database() {
  const state = { raw: fixture(), rows: [], admin: true, wedding: "wedding", failBackup: false, concurrent: false, touched: [], nextId: 1 };
  const id = () => `00000000-0000-4000-8000-${String(state.nextId++).padStart(12, "0")}`;
  const insert = (data) => {
    const row = { ...structuredClone(data), id: id(), created_at: new Date().toISOString() };
    state.rows.push(row); return row;
  };
  globalThis.__visualDb = {
    from(table) {
      state.touched.push(table);
      const filters = {};
      let inserted;
      const builder = {
        select() { return this; }, eq(key, value) { filters[key] = value; return this; },
        order() { return this; }, insert(data) { inserted = data; return this; }, delete() { this.deleting = true; return this; },
        async maybeSingle() {
          if (table === "invitaciones") return { data: state.admin ? { wedding_id: state.wedding } : null };
          if (table === "bodas") return { data: filters.id === "wedding" ? { id: "wedding", config_json: structuredClone(state.raw) } : null };
          if (this.deleting) {
            const index = state.rows.findIndex((row) => row.id === filters.id && row.wedding_id === filters.wedding_id);
            return { data: index < 0 ? null : state.rows.splice(index, 1)[0] };
          }
          return { data: state.rows.find((row) => row.id === filters.id && row.wedding_id === filters.wedding_id) ?? null };
        },
        async single() { return { data: insert(inserted) }; },
        then(resolve, reject) {
          return Promise.resolve({ data: state.rows.filter((row) => row.wedding_id === filters.wedding_id).map((row) => {
            const summary = { ...row }; delete summary.snapshot; return summary;
          }) }).then(resolve, reject);
        },
      };
      return builder;
    },
    async rpc(name, args) {
      assert.equal(name, "apply_visual_version");
      if (state.concurrent || JSON.stringify(state.raw) !== JSON.stringify(args.p_expected_config)) return { error: { message: "Concurrent update", code: "40001" } };
      if (state.failBackup) return { error: { message: "Backup insertion failed" } };
      const backup = insert({ wedding_id: args.p_wedding_id, name: args.p_name, kind: "backup", schema_version: 1, snapshot: args.p_backup });
      state.raw = structuredClone(args.p_next_config);
      return { data: backup.id };
    },
  };
  return state;
}
const post = (body) => route.POST(new Request("http://localhost/api/admin/fixture-admin/visual-versions", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), params);
const del = (body) => route.DELETE(new Request("http://localhost/api/admin/fixture-admin/visual-versions", {
  method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), params);
const get = (id = "") => route.GET(new Request(`http://localhost/api/admin/fixture-admin/visual-versions${id ? `?id=${id}` : ""}`), params);

test("real handlers save without publishing, reload, compare without writes, apply with backup and restore original", async () => {
  const state = database();
  const original = structuredClone(state.raw);
  const candidate = capture(changed(original));
  const saved = await post({ action: "save", name: "B", snapshot: candidate });
  assert.equal(saved.status, 201);
  const { version } = await saved.json();
  candidate.theme.colores.bronze = "unrelated mutation";
  assert.deepEqual(state.raw, original);
  const list = await (await get()).json();
  assert.equal(list.versions[0].id, version.id);
  const preview = await (await get(version.id)).json();
  assert.ok(preview.changes.length > 0);
  assert.equal(state.rows.length, 1);
  assert.deepEqual(state.raw, original);
  const applied = await post({ action: "apply", id: version.id, expectedRevision: preview.revision, acknowledgeResources: true });
  assert.equal(applied.status, 200);
  const { backupId } = await applied.json();
  assert.equal(state.rows.find((row) => row.id === backupId).kind, "backup");
  assert.deepEqual(capture(resolveWeddingConfig(state.raw)), capture(resolveWeddingConfig(changed(original))));
  const recovery = await (await get(backupId)).json();
  assert.equal((await post({ action: "apply", id: backupId, expectedRevision: recovery.revision, acknowledgeResources: true })).status, 200);
  assert.deepEqual(capture(resolveWeddingConfig(state.raw)), capture(resolveWeddingConfig(original)));
  assert.deepEqual(state.raw.rsvp, original.rsvp);
  assert.deepEqual(state.raw.historia, original.historia);
  assert.deepEqual(state.raw.diseno.margenesPc, original.diseno.margenesPc);
  assert.ok(state.touched.every((table) => ["bodas", "invitaciones", "visual_versions"].includes(table)));
  assert.equal(state.rows.length, 3);
});

test("authorization is mandatory and scoped to wedding; malformed actions/schemas never publish", async () => {
  const state = database();
  state.admin = false;
  assert.equal((await get()).status, 403);
  assert.equal((await post({ action: "save", name: "No" })).status, 403);
  state.admin = true; state.wedding = "other-wedding";
  assert.equal((await get()).status, 404);
  state.wedding = "wedding";
  assert.equal((await post({ action: "save", name: "", snapshot: capture(state.raw) })).status, 400);
  assert.equal((await post({ action: "save", name: "Bad", snapshot: { schemaVersion: 2 } })).status, 400);
  assert.equal((await post({ action: "publish" })).status, 400);
  assert.equal((await get("not-a-uuid")).status, 400);
  state.wedding = "wedding";
  state.admin = false;
  assert.equal((await del({ id: "00000000-0000-4000-8000-000000000001" })).status, 403);
  assert.equal(state.rows.length, 0);
});

test("admin deletes snapshots without changing applied configuration; missing and other-wedding versions are rejected", async () => {
  const state = database();
  const published = structuredClone(state.raw);
  const saved = await (await post({ action: "save", name: "Disposable", snapshot: capture(state.raw) })).json();
  const deleted = await del({ id: saved.version.id });
  assert.equal(deleted.status, 200);
  assert.equal(state.rows.length, 0);
  assert.deepEqual(state.raw, published);
  assert.equal((await del({ id: saved.version.id })).status, 404);
  const other = await (await post({ action: "save", name: "Other", snapshot: capture(state.raw) })).json();
  state.wedding = "other";
  assert.equal((await del({ id: other.version.id })).status, 404);
  state.wedding = "wedding";
  state.admin = false;
  assert.equal((await del({ id: other.version.id })).status, 403);
});

test("backup failure and concurrent updates abort restoration; missing assets require acknowledgement", async () => {
  const state = database();
  const original = structuredClone(state.raw);
  const candidate = capture(changed(original));
  candidate.design.fondoPaginaImagen = "/images/visual-test-does-not-exist.png";
  const { version } = await (await post({ action: "save", name: "B", snapshot: candidate })).json();
  const preview = await (await get(version.id)).json();
  assert.equal((await post({ action: "apply", id: version.id, expectedRevision: preview.revision })).status, 409);
  assert.deepEqual(state.raw, original);
  state.failBackup = true;
  assert.equal((await post({ action: "apply", id: version.id, expectedRevision: preview.revision, acknowledgeResources: true })).status, 503);
  assert.deepEqual(state.raw, original);
  assert.equal(state.rows.length, 1);
  state.failBackup = false; state.concurrent = true;
  assert.equal((await post({ action: "apply", id: version.id, expectedRevision: preview.revision, acknowledgeResources: true })).status, 409);
  assert.deepEqual(state.raw, original);
  assert.equal(state.rows.length, 1);
  state.concurrent = false; state.raw.textos.bienvenida = "Another admin changed content";
  assert.equal((await post({ action: "apply", id: version.id, expectedRevision: preview.revision, acknowledgeResources: true })).status, 409);
  assert.equal(state.rows.length, 1);
});

test("default restoration is visual-only and creates a recoverable backup; SQL is locked and service-only", async () => {
  const state = database();
  const original = structuredClone(state.raw);
  const response = await resetRoute.DELETE(new Request("http://localhost"), params);
  assert.equal(response.status, 200);
  const { backupId } = await response.json();
  assert.ok(state.rows.some((row) => row.id === backupId));
  assert.deepEqual(state.raw.historia, original.historia);
  assert.deepEqual(state.raw.timeline, original.timeline);
  assert.deepEqual(state.raw.textos, original.textos);
  assert.deepEqual(JSON.parse(JSON.stringify(state.raw.diseno.secciones[0].portadaLibre.elementos)), original.diseno.secciones[0].portadaLibre.elementos);
  assert.deepEqual(state.raw.diseno.margenesPc, original.diseno.margenesPc);
  const sql = await source("../../supabase/migrations/20261009_visual_versions.sql");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for update/);
  assert.match(sql, /is distinct from p_expected_config/);
  assert.ok(sql.indexOf("insert into public.visual_versions") < sql.indexOf("update public.bodas"));
  assert.match(sql, /revoke all on function.*from public, anon, authenticated/);
  assert.match(sql, /grant select, insert, delete on public.visual_versions to service_role/);
  const deletionMigration = await source("../../supabase/migrations/20261009b_visual_versions_delete.sql");
  assert.match(deletionMigration, /grant delete on public\.visual_versions to service_role/);
});
