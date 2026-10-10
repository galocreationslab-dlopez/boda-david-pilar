import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, imports = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

const layout = load("./timeline-layout.ts");
const json = (value) => JSON.parse(JSON.stringify(value));

test("old configurations keep the historical renderer; defaults for both devices are independent", () => {
  const config = layout.normalizeTimelinePlantilla();
  assert.equal(config.activa, false);
  config.pc.zonas.logo.tamano = 200;
  config.pc.orden.reverse();
  assert.equal(config.movil.zonas.logo.tamano, 72);
  assert.deepEqual(json(config.movil.orden), ["logo", "hora", "titulo", "descripcion"]);
});

test("normalization clamps dimensions, preserves custom roles and repairs incomplete zone order", () => {
  const config = layout.normalizeTimelinePlantilla({
    activa: true,
    pc: { ancho: Infinity, alturaMinima: 1, rellenoInterior: 10000, orden: ["titulo", "titulo", "unknown"],
      zonas: { logo: { tamano: -4 }, descripcion: { colorRol: "custom-role", fuenteRol: "invalid", tamano: 1000 } } },
    movil: { marcoVisible: false, ancho: 340, zonas: { logo: { tamano: 44 } } },
  });
  assert.equal(config.pc.ancho, 360);
  assert.equal(config.pc.alturaMinima, 320);
  assert.equal(config.pc.rellenoInterior, 64);
  assert.equal(config.pc.zonas.logo.tamano, 16);
  assert.equal(config.pc.zonas.descripcion.tamano, 96);
  assert.equal(config.pc.zonas.descripcion.colorRol, "custom-role");
  assert.equal(config.pc.zonas.descripcion.fuenteRol, "textos");
  assert.deepEqual(json(config.pc.orden), ["titulo", "logo", "hora", "descripcion"]);
  assert.equal(config.movil.marcoVisible, false);
  assert.equal(config.movil.zonas.logo.tamano, 44);
  assert.deepEqual(json(layout.normalizeTimelinePlantilla(json(config))), json(config));
});

const { SeccionTimeline } = load("../components/wedding/SeccionTimeline.tsx", {
  react, "react/jsx-runtime": jsxRuntime,
  "@/components/ui/OrnamentoDivisor": { OrnamentoDivisor: () => null },
  "@/lib/drive-image": { resolveDriveMediaSrc: (src) => src },
  "@/components/media/ImageMapFlip": { default: ({ children, frontStyle, link, showMapHelp }) =>
    react.createElement("div", { "data-flip-link": link, "data-map-help": showMapHelp, style: frontStyle }, children) },
  "@/lib/portada-libre": { getGoogleMapsLinkUrl: (src) => src },
  "@/lib/timeline-logo-size": load("./timeline-logo-size.ts"),
  "@/lib/timeline-layout": layout,
  "@/components/wedding/PortadaLibre": { resolvePortadaColor: (_mode, role, _hex, colors) => colors[role] },
  "@/lib/theme-roles": { withTextureStyle: (_key, style) => style },
  "./TimelinePlantilla.module.css": { default: { entries: "entries", mobile: "mobile", entry: "entry", frame: "frame", zone: "zone", logo: "logo" } },
});
const items = [
  { id: "one", hora: "12:00", titulo: "Ceremony", descripcion: "Church", icono: "rings", logoTamano: { pc: 180, movil: 24 }, enlaceMaps: "https://maps.google.com/?q=Church" },
  { id: "two", hora: "14:00", titulo: "Party ".repeat(10), descripcion: "A long description ".repeat(100), icono: "finca", logoTamano: { pc: 40, movil: 100 }, enlaceMaps: "" },
];

for (const [viewport, device, size] of [["desktop", "pc", 90], ["movil", "movil", 48]]) {
  test(`shared template on ${device} retains all content and overrides individual logo sizes`, () => {
    const plantilla = layout.normalizeTimelinePlantilla({ activa: true,
      pc: { zonas: { logo: { tamano: 90 } } }, movil: { marcoVisible: false, zonas: { logo: { tamano: 48 } } } });
    const html = renderToStaticMarkup(react.createElement(SeccionTimeline, {
      timeline: items, localizaciones: [], viewport, plantilla,
      roleColors: { titulo: "#123456", logo: "#abcdef" },
      componentStyles: { "timeline.titulo": { fontSize: 10, color: "#000000" } },
    }));
    assert.match(html, new RegExp(`data-timeline-template="${device}"`));
    assert.equal((html.match(/<article/g) ?? []).length, 2);
    assert.equal((html.match(new RegExp(`width="` + size + `"`, "g")) ?? []).length, 2);
    for (const item of items) {
      assert.ok(html.includes(item.hora));
      assert.ok(html.includes(item.titulo));
      assert.ok(html.includes(item.descripcion));
    }
    assert.match(html, /font-size:24px/);
    assert.match(html, /color:#123456/);
    assert.match(html, /data-map-help="false"/);
    if (device === "movil") assert.match(html, /background-color:transparent/);
    assert.deepEqual(items[0].logoTamano, { pc: 180, movil: 24 });
  });
}

test("frame is outside the flip, with a 320px minimum and flow-based zones instead of absolute text positions", () => {
  const source = readFileSync(new URL("../components/wedding/SeccionTimeline.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../components/wedding/TimelinePlantilla.module.css", import.meta.url), "utf8");
  assert.ok(source.indexOf("data-map-frame") < source.indexOf("<ImageMapFlip"));
  assert.ok(source.indexOf("data-map-frame") > source.indexOf("<article key={punto.id} className={templateStyles.entry}>"));
  assert.match(css, /grid-auto-rows: 1fr/);
  assert.match(css, /grid-auto-flow: column/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /position:\s*absolute/);
  assert.equal(layout.TIMELINE_MEDIDAS.alturaMinima.min, 320);
});
