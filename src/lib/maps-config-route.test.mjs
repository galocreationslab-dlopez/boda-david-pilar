import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const mapsUrl = moduleUrl(compile(await readFile(new URL("./portada-libre.ts", import.meta.url), "utf8")));
const timelineUrl = moduleUrl(compile(await readFile(new URL("./timeline-layout.ts", import.meta.url), "utf8")));
const modules = {
  "next/server": "export const NextResponse = { json: (value, init) => Response.json(value, init) };",
  "next/cache": "export const revalidatePath = () => {};",
  "@/lib/supabase/server": "export const createServerClient = () => globalThis.__mapsDb;",
  "@/lib/admin-auth": "export const validateAdminCode = async () => globalThis.__mapsAuthorized;",
  "@/lib/wedding-config-server": "export const getWeddingConfig = async () => globalThis.__mapsSaved;",
  "@/config/wedding.config": 'export const weddingConfig = { slug: "test-wedding" };',
};
let routeSource = await readFile(new URL("../app/api/admin/[inviteCode]/config/route.ts", import.meta.url), "utf8");
for (const [name, code] of Object.entries(modules)) routeSource = routeSource.replace(`from "${name}"`, `from "${moduleUrl(code)}"`);
routeSource = routeSource.replace('from "@/lib/portada-libre"', `from "${mapsUrl}"`);
routeSource = routeSource.replace('from "@/lib/timeline-layout"', `from "${timelineUrl}"`);
const { POST, GET } = await import(moduleUrl(compile(routeSource)));
const params = { params: Promise.resolve({ inviteCode: "fixture-admin" }) };

function database() {
  globalThis.__mapsAuthorized = true;
  globalThis.__mapsSaved = { unrelated: { preserved: true } };
  const rows = [];
  globalThis.__mapsDb = {
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: table === "bodas" ? { id: "wedding", config_json: globalThis.__mapsSaved } : { id: "type" } };
        },
        update(value) {
          globalThis.__mapsSaved = value.config_json;
          return { eq: async () => ({ error: null }) };
        },
        upsert() { return { select: () => ({ single: async () => ({ data: { id: "section" } }) }) }; },
        delete() { return { eq: async () => ({ error: null }) }; },
        async insert(value) { rows.push(...value); return { error: null }; },
      };
    },
  };
  return rows;
}

const post = (patch) => POST(new Request("http://localhost/api/admin/fixture-admin/config", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
}), params);

test("real config POST/GET handlers preserve both image actions and timeline Maps on reload", async () => {
  const rows = database();
  const event = { id: "church", titulo: "Church", enlaceMaps: " http://maps.google.com/?q=Granada ", enlaceMapsEmbed: "https://www.google.com/maps?q=Granada", logoTamano: { movil: 24, pc: 180 } };
  const image = { id: "cover", tipo: "imagen", enlaceUrl: "https://example.com", enlaceMaps: event.enlaceMaps, accionImagen: "mapa" };
  const patch = { timeline: [event], diseno: { secciones: [{ tipo: "portadaLibre", portadaLibre: { elementos: [image] } }, { tipo: "timeline", items: [event] }] } };
  assert.equal((await post(patch)).status, 200);
  const { config } = await (await GET(new Request("http://localhost"), params)).json();
  assert.equal(config.timeline[0].enlaceMaps, "https://maps.google.com/?q=Granada");
  assert.equal(config.timeline[0].enlaceMapsEmbed, "https://www.google.com/maps?q=Granada&output=embed");
  assert.deepEqual(config.timeline[0].logoTamano, event.logoTamano);
  assert.equal(config.diseno.secciones[0].portadaLibre.elementos[0].enlaceUrl, image.enlaceUrl);
  assert.equal(config.diseno.secciones[0].portadaLibre.elementos[0].accionImagen, "mapa");
  assert.equal(config.unrelated.preserved, true);
  assert.equal(rows[0].payload.enlaceMaps, config.timeline[0].enlaceMaps);
  config.timeline[0].enlaceMaps = "";
  config.timeline[0].enlaceMapsEmbed = "";
  config.diseno.secciones[0].portadaLibre.elementos[0].enlaceMaps = "";
  assert.equal((await post(config)).status, 200);
  const reloaded = (await (await GET(new Request("http://localhost"), params)).json()).config;
  assert.equal(reloaded.timeline[0].enlaceMaps, "");
  assert.equal(reloaded.diseno.secciones[0].portadaLibre.elementos[0].enlaceMaps, "");
  assert.equal(reloaded.diseno.secciones[0].portadaLibre.elementos[0].enlaceUrl, image.enlaceUrl);
});

test("invalid Maps or HTML are rejected before saving; admin authorization remains required", async () => {
  database();
  for (const patch of [
    { timeline: [{ enlaceMaps: "javascript:alert(1)" }] },
    { diseno: { secciones: [{ portadaLibre: { elementos: [{ enlaceMaps: "https://evil.com/maps" }] } }] } },
    { timeline: [{ enlaceMapsEmbed: '<iframe src="https://www.google.com/maps"></iframe>' }] },
  ]) {
    const response = await post(patch);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
    assert.deepEqual(globalThis.__mapsSaved, { unrelated: { preserved: true } });
  }
  globalThis.__mapsAuthorized = false;
  assert.equal((await post({ timeline: [] })).status, 403);
});

test("timeline section templates normalize at persistence and reload without altering individual entries", async () => {
  database();
  const entries = [
    { id: "one", hora: "12:00", titulo: "Short", descripcion: "Church", logoTamano: { pc: 180, movil: 24 }, enlaceMaps: "https://maps.google.com/?q=Church" },
    { id: "two", hora: "14:00", titulo: "Longer title", descripcion: "Venue ".repeat(50), logoTamano: { pc: 30, movil: 64 }, enlaceMaps: "" },
  ];
  const template = { activa: true, pc: { ancho: 480, alturaMinima: 10, zonas: { logo: { tamano: 90 } } }, movil: { ancho: 340, zonas: { logo: { tamano: 48 } } } };
  assert.equal((await post({ diseno: { secciones: [
    { id: "new", tipo: "timeline", timelinePlantilla: template, items: entries },
    { id: "old", tipo: "timeline", items: entries },
    { id: "other", tipo: "timeline", timelinePlantilla: { activa: true, pc: { ancho: 640 } }, items: entries },
  ] } })).status, 200);
  const loaded = (await (await GET(new Request("http://localhost"), params)).json()).config;
  const [section, old, other] = loaded.diseno.secciones;
  assert.equal(section.timelinePlantilla.pc.ancho, 480);
  assert.equal(section.timelinePlantilla.pc.alturaMinima, 320);
  assert.equal(section.timelinePlantilla.movil.ancho, 340);
  assert.equal(section.timelinePlantilla.pc.zonas.logo.tamano, 90);
  assert.equal(section.timelinePlantilla.movil.zonas.logo.tamano, 48);
  assert.deepEqual(section.items, entries);
  assert.equal(old.timelinePlantilla, undefined);
  assert.equal(other.timelinePlantilla.pc.ancho, 640);
  section.timelinePlantilla.activa = false;
  assert.equal((await post({ diseno: loaded.diseno })).status, 200);
  const reloaded = (await (await GET(new Request("http://localhost"), params)).json()).config.diseno.secciones[0];
  assert.equal(reloaded.timelinePlantilla.activa, false);
  assert.deepEqual(reloaded.items[0].logoTamano, { pc: 180, movil: 24 });
  assert.equal(reloaded.timelinePlantilla.pc.zonas.logo.tamano, 90);
});

test("editing a template clears only its applied visual overlay so reload cannot resurrect old styles", async () => {
  database();
  globalThis.__mapsSaved = {
    visualSchema: "wedding-visual-v1",
    visualSnapshot: { sections: [
      { id: "edited", style: { timelinePlantilla: { old: true }, componentRoles: { "timeline.fecha": "titulo" } } },
      { id: "untouched", style: { timelinePlantilla: { preserved: true } } },
    ] },
  };
  assert.equal((await post({ diseno: { secciones: [
    { id: "edited", tipo: "timeline", timelinePlantilla: { activa: true, pc: { fondoRol: "new-role" } } },
  ] } })).status, 200);
  const stored = globalThis.__mapsSaved;
  assert.equal(stored.visualSnapshot.sections[0].style.timelinePlantilla, undefined);
  assert.deepEqual(stored.visualSnapshot.sections[0].style.componentRoles, { "timeline.fecha": "titulo" });
  assert.deepEqual(stored.visualSnapshot.sections[1].style.timelinePlantilla, { preserved: true });
  assert.equal(stored.diseno.secciones[0].timelinePlantilla.pc.fondoRol, "new-role");
});
