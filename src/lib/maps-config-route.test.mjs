import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const mapsUrl = moduleUrl(compile(await readFile(new URL("./portada-libre.ts", import.meta.url), "utf8")));
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
