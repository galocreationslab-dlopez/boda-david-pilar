import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const utilityModule = { exports: {} };
new Function("require", "exports", compile(await readFile(new URL("./portada-libre.ts", import.meta.url), "utf8")))(require, utilityModule.exports);
const renderModule = { exports: {} };
const source = await readFile(new URL("../components/wedding/PortadaLibre.tsx", import.meta.url), "utf8");
new Function("require", "exports", compile(source))((name) => {
  if (name === "@/lib/portada-libre") return utilityModule.exports;
  if (name.startsWith("@/components/")) return { default: ({ children }) => children };
  return require(name);
}, renderModule.exports);
const { PortadaElementoContenido } = renderModule.exports;
const layout = { x: 5, y: 10, w: 80, h: 20, fuenteRol: "titulos", tamano: 32, alineacion: "left", negrita: true, cursiva: true };
const render = (elemento, dispositivo = "pc") => renderToStaticMarkup(React.createElement(PortadaElementoContenido, {
  elemento, layout, dispositivo, roleColors: {},
}));

test("text links render as underlined anchors on mobile/PC and survive JSON reload", () => {
  const text = JSON.parse(JSON.stringify({ id: "text", tipo: "texto", texto: "Cómo llegar", enlaceUrl: " https://example.com/location " }));
  for (const device of ["pc", "movil"]) {
    const html = render(text, device);
    assert.match(html, /href="https:\/\/example.com\/location"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /text-decoration:underline/);
    assert.match(html, /text-align:left/);
    assert.match(html, /font-weight:700/);
    assert.match(html, /font-style:italic/);
    assert.match(html, /Cómo llegar/);
  }
});

test("empty, removed and unsafe links preserve plain text without underlining", () => {
  for (const enlaceUrl of [undefined, "", " ", "javascript:alert(1)", "not a URL"]) {
    const html = render({ id: "text", tipo: "texto", texto: "Texto", enlaceUrl });
    assert.doesNotMatch(html, /<a |text-decoration:underline/);
    assert.match(html, /Texto/);
  }
});

test("mailto/tel links and legacy link elements preserve their behavior", () => {
  for (const enlaceUrl of ["mailto:example@example.com", "tel:+34123456789"]) {
    const html = render({ id: "text", tipo: "texto", texto: "Contacto", enlaceUrl });
    assert.ok(html.includes(`href="${enlaceUrl}"`));
    assert.doesNotMatch(html, /target="_blank"/);
    assert.match(html, /text-decoration:underline/);
  }
  const html = render({ id: "legacy", tipo: "enlace", texto: "Enlace", url: "https://example.com" });
  assert.match(html, /href="https:\/\/example.com\/"/);
  assert.match(html, /text-decoration:underline/);
});
