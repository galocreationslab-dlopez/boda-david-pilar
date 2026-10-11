import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import * as react from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function compile(source, imports = {}, globals = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    ...globals,
    exports,
    require(id) {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return exports;
}

function loadModule(path, imports, globals) {
  return compile(readFileSync(new URL(path, import.meta.url), "utf8"), imports, globals);
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

const timelineImports = {
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
  "./TimelinePlantilla.module.css": {
    default: Object.fromEntries(["viewport", "entries", "desktop", "mobile", "entry", "frame", "flip", "front", "zone", "logo"].map((key) => [key, key])),
  },
};
const { SeccionTimeline } = loadModule("../src/components/wedding/SeccionTimeline.tsx", timelineImports);

for (const device of ["desktop", "movil"]) {
  test(`shared timeline fits its container proportionally only on ${device}`, () => {
    const effects = [];
    const container = { clientWidth: 1000 };
    const entries = { scrollWidth: 1832, style: {} };
    const refs = [{ current: container }, { current: entries }];
    const observers = [];
    const { SeccionTimeline: Timeline } = loadModule("../src/components/wedding/SeccionTimeline.tsx", {
      ...timelineImports,
      react: {
        ...react,
        useRef: () => refs.shift(),
        useEffect: (effect) => effects.push(effect),
      },
    }, {
      ResizeObserver: class {
        targets = [];
        disconnected = false;
        constructor(update) { this.update = update; observers.push(this); }
        observe(target) { this.targets.push(target); }
        disconnect() { this.disconnected = true; }
      },
    });
    const html = renderToStaticMarkup(createElement(Timeline, {
      localizaciones: [],
      timeline: [],
      viewport: device,
      plantilla: { activa: true, pc: { ancho: 600 } },
    }));
    assert.match(html, new RegExp(`class="entries ${device === "movil" ? "mobile" : "desktop"}"`));
    const cleanup = effects[0]();
    if (device === "movil") {
      assert.equal(observers.length, 0);
      assert.equal(entries.style.zoom, undefined);
      return;
    }
    const [observer] = observers;
    assert.deepEqual(observer.targets, [container, entries]);
    assert.equal(Number(entries.style.zoom), 1000 / 1832);
    for (const availableWidth of [640, 768, 1100, 2000]) {
      container.clientWidth = availableWidth;
      observer.update();
      const scale = Number(entries.style.zoom);
      assert.ok(entries.scrollWidth * scale <= availableWidth + 0.001);
      assert.ok(scale <= 1);
    }
    container.clientWidth = 900;
    entries.scrollWidth = 2428;
    observer.update();
    assert.equal(Number(entries.style.zoom), 900 / 2428);
    cleanup();
    assert.equal(observer.disconnected, true);
    assert.equal(entries.style.zoom, "");
  });
}

test("desktop template keeps its natural dimensions for uniform scaling without a scroll container", () => {
  const css = readFileSync(new URL("../src/components/wedding/TimelinePlantilla.module.css", import.meta.url), "utf8");
  assert.match(css, /\.desktop\s*\{[^}]*width:\s*max-content;[^}]*grid-auto-columns:\s*var\(--timeline-width\);/);
  assert.doesNotMatch(css, /overflow-x:\s*(auto|scroll)/);
  assert.match(css, /\.mobile\s*\{[^}]*grid-auto-flow:\s*row;[^}]*grid-template-columns:\s*min\(var\(--timeline-width\),\s*100%\);/);
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
