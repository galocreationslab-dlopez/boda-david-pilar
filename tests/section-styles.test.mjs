import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import * as react from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function compile(source, imports = {}) {
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

function loadModule(path, imports) {
  return compile(readFileSync(new URL(path, import.meta.url), "utf8"), imports);
}

function loadComponentStyle(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node))
      && node.name?.getText(file) === "getComponentStyleByKey") {
      declaration = node;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(declaration, `Missing component style resolver in ${path}`);
  const text = declaration.getText(file);
  return compile(`${ts.isVariableDeclaration(declaration) ? "const " : ""}${text};
    exports.resolveStyle = getComponentStyleByKey;`).resolveStyle;
}

const { SeccionCarrusel } = loadModule("../src/components/wedding/SeccionCarrusel.tsx", {
  react,
  "react/jsx-runtime": jsxRuntime,
  "@/lib/drive-image": { resolveDriveMediaSrc: (src) => src },
  "@/components/media/ImageTreatmentFrame": { default: ({ children }) => children },
});

for (const path of [
  "../src/components/wedding/WeddingPage.tsx",
  "../src/components/admin/ConfiguracionView.tsx",
]) {
  test(`carousel navigation receives the selected role color in ${path}`, () => {
    const resolveStyle = loadComponentStyle(path);
    for (const color of ["#ab1234", "#456789"]) {
      const navigationStyle = resolveStyle("carrusel.navegacion", color);
      assert.equal(navigationStyle.color, color);
      const html = renderToStaticMarkup(createElement(SeccionCarrusel, {
        items: [
          { id: "one", titulo: "One", imagen: "/one.jpg" },
          { id: "two", titulo: "Two", imagen: "/two.jpg" },
        ],
        navigationStyle,
      }));
      assert.match(html, new RegExp(`class="mt-3 flex items-center gap-2" style="color:${color}"`));
      assert.match(html, /aria-label="Foto anterior"[^>]*border-current/);
      assert.match(html, /aria-label="Foto siguiente"[^>]*border-current/);
      assert.equal((html.match(/rounded-full bg-current/g) ?? []).length, 2);
      assert.match(html, /aria-label="Foto anterior"[^>]*disabled=""/);
      assert.match(html, /aria-label="Ir a foto 1" aria-current="true"/);
    }
  });
}

const { SeccionTimeline } = loadModule("../src/components/wedding/SeccionTimeline.tsx", {
  react,
  "react/jsx-runtime": jsxRuntime,
  "@/components/ui/OrnamentoDivisor": { OrnamentoDivisor: () => null },
  "@/lib/drive-image": { resolveDriveMediaSrc: (src) => src },
  "@/components/media/ImageMapFlip": {
    default: ({ children, frontClassName }) => createElement("div", { className: frontClassName }, children),
  },
  "@/lib/portada-libre": { getGoogleMapsLinkUrl: (src) => src },
  "@/lib/timeline-logo-size": loadModule("../src/lib/timeline-logo-size.ts"),
  "@/lib/timeline-layout": loadModule("../src/lib/timeline-layout.ts"),
  "@/components/wedding/PortadaLibre": { resolvePortadaColor: (_mode, role, _hex, colors) => colors[role] },
  "@/lib/theme-roles": { withTextureStyle: (_key, style) => style },
  "./TimelinePlantilla.module.css": { default: {} },
});

test("desktop timeline centers each title and description without changing mobile layout", () => {
  const html = renderToStaticMarkup(createElement(SeccionTimeline, {
    localizaciones: [],
    timeline: [
      { id: "ceremony", hora: "12:00", titulo: "Ceremony", descripcion: "Church", icono: "rings" },
      { id: "party", hora: "14:00", titulo: "Party", descripcion: "Venue", icono: "rings" },
    ],
  }));
  const desktop = html.slice(html.indexOf('class="relative hidden w-full pb-4 md:block"'));
  assert.equal((desktop.match(/class="tex-white w-full text-center"/g) ?? []).length, 2);
  for (const [title, description] of [["Ceremony", "Church"], ["Party", "Venue"]]) {
    assert.match(desktop, new RegExp(`class="tex-white w-full text-center"[^>]*><p[^>]*>${title}</p><p[^>]*>${description}</p>`));
  }
  const mobile = html.slice(0, html.indexOf('class="relative hidden w-full pb-4 md:block"'));
  assert.match(mobile, /class="space-y-6 md:hidden"/);
  assert.equal((mobile.match(/class="tex-white space-y-3 border px-4 pb-4 pt-3"/g) ?? []).length, 2);
});
