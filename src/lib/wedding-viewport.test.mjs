import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(file) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { normalizePageMargins, getUsefulViewport, getPageBackgroundStyle } = await load("./wedding-viewport.ts");
const { getPortadaAspectLayout } = await load("./portada-aspect-ratio.ts");

test("legacy config and zero margins preserve the full viewport", () => {
  assert.deepEqual(normalizePageMargins(), { izquierdo: 0, derecho: 0 });
  assert.deepEqual(getUsefulViewport(1440, normalizePageMargins(), true), { width: 1440, left: 0, right: 0 });
  assert.equal(getPageBackgroundStyle(undefined, (src) => src || "").backgroundImage, "var(--tex-cream, none)");
});

test("asymmetric PC margins are subtracted on every resize; mobile ignores them", () => {
  const margins = { izquierdo: 120, derecho: 80 };
  for (const width of [768, 1024, 1440, 1920]) {
    assert.deepEqual(getUsefulViewport(width, margins, true), { width: width - 200, left: 120, right: 80 });
  }
  assert.deepEqual(getUsefulViewport(390, margins, false), { width: 390, left: 0, right: 0 });
});

test("oversized margins cannot produce negative widths or lose their proportions", () => {
  for (const margins of [{ izquierdo: 1000, derecho: 2000 }, { izquierdo: 1e308, derecho: 1e308 }]) {
    const result = getUsefulViewport(800, margins, true);
    assert.ok(Math.abs(result.width - 1) < 0.001);
    assert.ok(Math.abs(result.left / result.right - margins.izquierdo / margins.derecho) < 0.001);
  }
  assert.deepEqual(normalizePageMargins({ izquierdo: -3, derecho: Infinity }), { izquierdo: 0, derecho: 0 });
});

test("page texture retains its fallback color and supports legacy images and clearing", () => {
  const resolve = (src) => src ? `/proxy?src=${src}` : "";
  const style = getPageBackgroundStyle({ fondoPaginaColor: "#123456", fondoPaginaImagen: "texture", fondoPaginaTexturaTamanoPx: 96 }, resolve);
  assert.equal(style.backgroundColor, "#123456");
  assert.equal(style.backgroundImage, 'url("/proxy?src=texture")');
  assert.equal(style.backgroundSize, "96px");
  assert.equal(style.backgroundRepeat, "repeat");
  assert.equal(getPageBackgroundStyle({ fondoPaginaImagen: "old" }, resolve).backgroundImage, 'url("/proxy?src=old")');
  assert.equal(getPageBackgroundStyle({ fondoPaginaColor: "#123456", fondoPaginaImagen: "" }, resolve).backgroundImage, "none");
});

test("cover percentages and locked image aspect ratios use useful width, not full viewport", () => {
  const useful = getUsefulViewport(1440, { izquierdo: 120, derecho: 80 }, true).width;
  const screenHeight = 900;
  const layout = { x: 10, y: 20, w: 30, h: 40, mantenerAspecto: true, aspectoFijar: "ancho" };
  const effective = getPortadaAspectLayout(layout, { width: 2, height: 1 }, useful / screenHeight);
  assert.equal(effective.x, 10);
  assert.equal(effective.w, 30);
  assert.ok(Math.abs((effective.w / 100 * useful) / (effective.h / 100 * screenHeight) - 2) < 0.001);
});
