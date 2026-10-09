import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/wedding/MainWithInvite.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2017,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

function mount({ search = "?inviteCode=TEST", deadline = "6 de febrero de 2027", fetchResult, now = new Date(2027, 1, 6, 12) } = {}) {
  const states = [];
  let cursor = 0;
  let effects = [];
  const errors = [];
  const routes = [];
  const requests = [];
  const exports = {};
  const imports = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect(effect) { effects.push(effect); },
    },
    "./HeroPortada": { HeroPortada: "HeroPortada" },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
  };
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
    Date: class extends Date {
      constructor(...args) {
        if (args.length) super(...args);
        else super(now.getTime());
      }
    },
    URLSearchParams,
    window: {
      location: { search, assign: (route) => routes.push(route) },
      requestAnimationFrame: (callback) => { callback(); return 1; },
      cancelAnimationFrame() {},
    },
    fetch: (...args) => {
      requests.push(args);
      return fetchResult ?? new Promise(() => {});
    },
    console: { error: (...args) => errors.push(args) },
  });
  const render = () => {
    cursor = 0;
    effects = [];
    return exports.default({
      config: { textos: { confirmacionLimite: deadline, bienvenida: "Original" } },
    }).props.children.props;
  };
  render();
  effects.forEach((effect) => effect());
  render();
  effects.forEach((effect) => effect());
  return { render, errors, routes, requests };
}

test("button appears while invitation request is still pending and navigates to RSVP", () => {
  const app = mount();
  const hero = app.render();
  assert.equal(hero.mostrarBotonConfirmar, true);
  hero.onConfirmarClick();
  assert.deepEqual(app.routes, ["/rsvp/TEST"]);
});

test("missing or blank invitation codes hide the button", () => {
  for (const search of ["", "?inviteCode=", "?inviteCode=%20%20"]) {
    assert.equal(mount({ search }).render().mostrarBotonConfirmar, false);
  }
  assert.equal(mount({ search: "?invitecode=TEST" }).render().mostrarBotonConfirmar, true);
});

test("invitation codes are trimmed and encoded, and loading bypasses cached responses", () => {
  const app = mount({ search: "?inviteCode=%20TEST%2F%3F%23%20" });
  app.render().onConfirmarClick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0][0], "/api/rsvp/TEST%2F%3F%23");
  assert.equal(app.requests[0][1].cache, "no-store");
  assert.deepEqual(app.routes, ["/rsvp/TEST%2F%3F%23"]);
  const lowercase = mount({ search: "?inviteCode=%20&invitecode=TEST" });
  assert.equal(lowercase.render().mostrarBotonConfirmar, true);
});

test("deadline includes the whole day, hides after expiry, and allows no deadline", () => {
  for (const now of [new Date(2027, 1, 6, 0), new Date(2027, 1, 6, 23, 59, 59, 999)]) {
    assert.equal(mount({ now }).render().mostrarBotonConfirmar, true);
  }
  assert.equal(mount({ now: new Date(2027, 1, 7, 0) }).render().mostrarBotonConfirmar, false);
  assert.equal(mount({ deadline: "", now: new Date(2028, 0, 1) }).render().mostrarBotonConfirmar, true);
});

test("HTTP and network failures are reported without hiding the button", async () => {
  for (const response of [
    () => Promise.resolve({ ok: false, status: 404 }),
    () => Promise.resolve({ ok: false, status: 500 }),
    () => Promise.reject(new Error("Network unavailable")),
  ]) {
    const app = mount({ fetchResult: response() });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(app.render().mostrarBotonConfirmar, true);
    assert.equal(app.errors.length, 1);
  }
});

test("empty invitation data does not hide the button", async () => {
  const app = mount({ fetchResult: Promise.resolve({ ok: true, json: async () => ({ invitacion: null }) }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.render().mostrarBotonConfirmar, true);
});

test("personalized welcome and administrator navigation remain available", async () => {
  const app = mount({
    now: new Date(2028, 0, 1),
    fetchResult: Promise.resolve({
      ok: true,
      json: async () => ({ invitacion: { tipo_invitacion: "admin", texto_invitacion_personalizado: "Hola" } }),
    }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  const hero = app.render();
  assert.equal(hero.mostrarBotonConfirmar, true);
  assert.equal(hero.labelBotonConfirmar, "Panel de administración");
  assert.equal(hero.config.textos.bienvenida, "Hola");
  hero.onConfirmarClick();
  assert.deepEqual(app.routes, ["/admin/TEST"]);
});
