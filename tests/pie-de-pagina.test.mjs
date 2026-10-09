import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

function loadModule(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return exports;
}

const { PieDePagina } = loadModule("../src/components/layout/PieDePagina.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "@/components/ui/SelloNupcial": { SelloNupcial: () => createElement("svg") },
  "@/components/wedding/PortadaLibre": {
    default: () => createElement("div", null, "Custom footer"),
  },
});
const { getPublicPieSection, getPieSectionForProfile } = loadModule("../src/lib/section-chains.ts");
const config = {
  novia: { nombre: "Pilar" },
  novio: { nombre: "David" },
  iniciales: { novia: "P", novio: "D" },
  fechaFormateada: "6 de febrero de 2027",
};
const customSection = { id: "footer", tipo: "pie", visible: true, pie: {} };

function render(diseno, seccionPie) {
  return renderToStaticMarkup(createElement(PieDePagina, {
    config: { ...config, diseno },
    seccionPie,
  }));
}

test("legacy configurations and enabled fallback retain the default footer", () => {
  for (const diseno of [undefined, {}, { usarPieFallback: true }]) {
    const html = render(diseno);
    assert.match(html, /<footer id="pie"/);
    assert.match(html, /Pilar &amp; David/);
    assert.match(html, /Hecho con amor/);
  }
});

test("disabled fallback renders no footer or empty wrapper", () => {
  assert.equal(render({ usarPieFallback: false }), "");
  assert.equal(render({ usarPieFallback: false }, { ...customSection, pie: undefined }), "");
});

test("visible custom footer takes precedence regardless of fallback setting", () => {
  for (const usarPieFallback of [undefined, true, false]) {
    const html = render({ usarPieFallback }, customSection);
    assert.match(html, /<footer id="pie"/);
    assert.match(html, /Custom footer/);
    assert.doesNotMatch(html, /Hecho con amor/);
  }
});

test("hidden or profile-restricted custom footers respect the fallback setting", () => {
  for (const section of [
    { ...customSection, visible: false },
    { ...customSection, perfiles: ["admin"] },
  ]) {
    const publicSection = getPublicPieSection([section]);
    assert.equal(publicSection, undefined);
    assert.equal(render({ usarPieFallback: false }, publicSection), "");
    assert.match(render({ usarPieFallback: true }, publicSection), /Hecho con amor/);
  }
  const adminSection = getPieSectionForProfile([{ ...customSection, perfiles: ["admin"] }], "admin");
  assert.match(render({ usarPieFallback: false }, adminSection), /Custom footer/);
});
