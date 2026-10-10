import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const modules = new Map();
const componentStubs = new Map();

function load(relativePath) {
  if (modules.has(relativePath)) return modules.get(relativePath).exports;
  const loadedModule = { exports: {} };
  modules.set(relativePath, loadedModule);
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "exports", compiled)((name) => {
    if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (name === "./InviteExtras") return { InviteExtras: () => null };
    if (name.startsWith("@/components/")) {
      if (!componentStubs.has(name)) {
        componentStubs.set(name, new Proxy({}, {
          get: (_, key) => key === "__esModule" ? true : `${name}:${String(key)}`,
        }));
      }
      return componentStubs.get(name);
    }
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
    if (name.startsWith("./")) {
      const directory = relativePath.slice(0, relativePath.lastIndexOf("/") + 1);
      return load(`${directory}${name.slice(2)}.ts`);
    }
    return require(name);
  }, loadedModule.exports);
  return loadedModule.exports;
}

const { weddingConfig } = load("config/wedding.config.ts");
const WeddingPage = load("components/wedding/WeddingPage.tsx").default;
const { InviteRsvpForm } = load("components/wedding/InviteRsvpForm.tsx");

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}

function page(rawSearchParams = {}, preview = false) {
  const config = structuredClone(weddingConfig);
  config.diseno.secciones = [
    { id: "intro", tipo: "intro", nombre: "Intro", visible: true, intro: { activo: true, repetir: "siempre" } },
    { id: "invitacion", tipo: "invitacion", nombre: "Invitacion", visible: true },
  ];
  return elements(WeddingPage({ config, galleryMedia: [], rawSearchParams, preview }));
}

test("RSVP return link preserves the encoded invitation code and requests no intro", () => {
  const html = renderToStaticMarkup(React.createElement(InviteRsvpForm, {
    inviteCode: "familia & amigos",
    invitacion: { nombre_visible: "Familia", tipo_invitacion: "familia" },
    personas: [],
  }));
  assert.match(html, /href="\/\?inviteCode=familia%20%26%20amigos&amp;skipIntro=1"/);
});

test("return renders the invitation without intro, content gate or intro preloads", () => {
  const tree = page({ inviteCode: "familia", skipIntro: "1" });
  assert.ok(tree.some((element) => element.type === "@/components/wedding/MainWithInvite:default"));
  assert.ok(!tree.some((element) => element.type === "@/components/motion/IntroReveal:default"));
  assert.ok(!tree.some((element) => element.type === "@/components/motion/PostIntroSectionsGate:default"));
  assert.ok(!tree.some((element) => element.type === "link" && element.props.rel === "preload"));
});

test("normal visits and design previews retain the configured intro", () => {
  for (const [params, preview] of [[{}, false], [{ skipIntro: "0" }, false], [{ skipIntro: ["1"] }, false], [{ skipIntro: "1" }, true]]) {
    const tree = page(params, preview);
    assert.ok(tree.some((element) => element.type === "@/components/motion/IntroReveal:default"));
  }
});

test("envelope preloads are restricted to the device that uses each original", () => {
  const config = structuredClone(weddingConfig);
  config.diseno.secciones = [{
    id: "intro", tipo: "intro", nombre: "Intro", visible: true,
    intro: {
      activo: true, repetir: "siempre", lacreUrl: "/seal.png",
      pc: { tipo: "envelope", envelope: { acabadoPaleta: "personalizado", modoFondo: "svgPersonalizado", imagenUrl: "/pc.png", selloSecoUrl: "/pc-stamp.png" } },
      movil: { tipo: "envelope", envelope: { acabadoPaleta: "personalizado", modoFondo: "svgPersonalizado", imagenUrl: "/mobile.png", selloSecoUrl: "/mobile-stamp.png" } },
    },
  }];
  const preloads = elements(WeddingPage({ config, galleryMedia: [] })).filter((e) => e.type === "link" && e.props.rel === "preload");
  for (const href of ["/pc.png", "/pc-stamp.png"]) {
    const preload = preloads.find((e) => e.props.href === href);
    assert.ok(preload, JSON.stringify(preloads.map((e) => e.props)));
    assert.equal(preload.props.media, "(min-width: 768px)");
  }
  for (const href of ["/mobile.png", "/mobile-stamp.png"]) {
    assert.equal(preloads.find((e) => e.props.href === href).props.media, "(max-width: 767.98px)");
  }
  assert.equal(preloads.find((e) => e.props.href === "/seal.png").props.fetchPriority, "high");
});
