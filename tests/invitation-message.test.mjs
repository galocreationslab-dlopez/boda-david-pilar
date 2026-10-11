import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, imports = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (id) => {
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, ...globals });
  return exports;
}

const helper = load("../src/lib/invitation-message.ts");
const url = "https://example.com/?inviteCode=A%26B";
const text = "  *Nos casamos* 💍\n_Celebra con nosotros_\n~No faltes~  ";

test("composes both positions preserving all text, WhatsApp markers, emojis and whitespace", () => {
  assert.equal(helper.composeInvitationMessage(url, { texto: text, posicionEnlace: "principio" }), `${url}\n\n${text}`);
  assert.equal(helper.composeInvitationMessage(url, { texto: text, posicionEnlace: "final" }), `${text}\n\n${url}`);
});

test("empty text keeps link-only behavior", () => {
  for (const texto of ["", " \n\t "]) {
    for (const posicionEnlace of ["principio", "final"]) {
      assert.equal(helper.composeInvitationMessage(url, { texto, posicionEnlace }), url);
    }
  }
  assert.equal(helper.composeInvitationMessage(url, helper.DEFAULT_INVITATION_MESSAGE), url);
});

function mount({ response = { ok: true }, clipboardFails = false } = {}) {
  const states = [];
  let cursor = 0;
  const requests = [];
  const copied = [];
  const prompts = [];
  const jsx = (type, props) => ({ type, props });
  const component = load("../src/components/admin/InvitacionesView.tsx", {
    react: { useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    } },
    xlsx: {},
    "@/lib/rsvp-status": {},
    "@/lib/invitation-message": helper,
    "react/jsx-runtime": { jsx, jsxs: jsx },
  }, {
    window: { location: { origin: "https://example.com" }, isSecureContext: true, prompt: (...args) => prompts.push(args) },
    navigator: { clipboard: { writeText: async (value) => { if (clipboardFails) throw new Error("Denied"); copied.push(value); } } },
    setTimeout() {},
    fetch: async (...args) => { requests.push(args); return response; },
  });
  const props = {
    inviteCode: "ADMIN",
    invitaciones: [{ id: "1", invite_code: "A&B", nombre_visible: "Guests", asistentes: [], estado: "pendiente", adultos_estimados: 2, ninos_estimados: 0, adolescentes_estimados: 0, bebes_estimados: 0 }],
    unreadByInvitationId: {},
    mensajeInvitacion: { texto: "Original", posicionEnlace: "final" },
  };
  const render = () => { cursor = 0; return component.default(props); };
  const find = (node, predicate) => {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, predicate);
      if (result) return result;
    }
  };
  const get = (predicate) => find(render(), predicate);
  const row = () => get((n) => typeof n.type === "function" && n.type.name === "InvitacionRow");
  const copy = async () => {
    const rowNode = row();
    const tree = rowNode.type(rowNode.props);
    const buttonNode = find(tree, (n) => typeof n.type === "function" && n.type.name === "CopyLinkButton");
    await buttonNode.type(buttonNode.props).props.onClick({ stopPropagation() {} });
  };
  return { get, row, copy, requests, copied, prompts };
}

test("list copies saved configuration only, and uses new text/position after successful save", async () => {
  const app = mount();
  app.get((n) => n.type === "textarea").props.onChange({ target: { value: text } });
  app.get((n) => n.type === "select").props.onChange({ target: { value: "principio" } });
  await app.copy();
  assert.equal(app.copied[0], `Original\n\n${url}`);
  await app.get((n) => n.type === "button" && n.props.children === "Guardar mensaje").props.onClick();
  assert.equal(app.requests[0][0], "/api/admin/ADMIN/config");
  assert.deepEqual(JSON.parse(app.requests[0][1].body), { mensajeInvitacion: { texto: text, posicionEnlace: "principio" } });
  await app.copy();
  assert.equal(app.copied[1], `${url}\n\n${text}`);
});

test("failed saves surface an error and keep the last saved message", async () => {
  for (const response of [{ ok: false, json: async () => ({ error: "Save denied" }) }, null]) {
    const app = mount({ response });
    app.get((n) => n.type === "textarea").props.onChange({ target: { value: "Unsaved" } });
    await app.get((n) => n.type === "button" && n.props.children === "Guardar mensaje").props.onClick();
    assert.ok(app.get((n) => n.props.role === "alert"));
    assert.equal(app.row().props.message.texto, "Original");
  }
});

test("manual clipboard fallback receives the entire composed invitation", async () => {
  const app = mount({ clipboardFails: true });
  await app.copy();
  assert.equal(app.prompts[0][1], `Original\n\n${url}`);
});

function configApi({ authorized = true, saveError = null } = {}) {
  const boda = { id: "wedding", config_json: { textos: { bienvenida: "Existing welcome" } } };
  let writes = 0;
  const route = load("../src/app/api/admin/[inviteCode]/config/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "next/cache": { revalidatePath() {} },
    "@/lib/supabase/server": { createServerClient: () => ({ from: (table) => {
      assert.equal(table, "bodas");
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: boda }) }) }),
        update: (patch) => ({ eq: async () => {
          writes++;
          if (!saveError) boda.config_json = patch.config_json;
          return { error: saveError };
        } }),
      };
    } }) },
    "@/lib/admin-auth": { validateAdminCode: async () => authorized },
    "@/lib/wedding-config-server": { getWeddingConfig: async () => boda.config_json },
    "@/config/wedding.config": { weddingConfig: { slug: "test" } },
    "@/lib/portada-libre": { normalizeMapsConfig: () => null },
    "@/lib/timeline-layout": { normalizeTimelineTemplates() {} },
  });
  const ctx = { params: Promise.resolve({ inviteCode: "ADMIN" }) };
  return {
    save: (message) => route.POST({ json: async () => ({ mensajeInvitacion: message }) }, ctx),
    get: () => route.GET({}, ctx),
    writes: () => writes,
  };
}

test("API persists the exact common message, reloads it and preserves unrelated configuration", async () => {
  const api = configApi();
  const message = { texto: text, posicionEnlace: "principio" };
  assert.equal((await api.save(message)).status, 200);
  const response = await api.get();
  assert.deepEqual(JSON.parse(JSON.stringify(response.body.config)), {
    textos: { bienvenida: "Existing welcome" },
    mensajeInvitacion: message,
  });
  assert.equal((await api.save({ texto: "", posicionEnlace: "final" })).status, 200);
  assert.equal((await api.get()).body.config.mensajeInvitacion.texto, "");
});

test("API rejects malformed message settings without writing", async () => {
  const api = configApi();
  for (const message of [null, [], "text", { texto: 123, posicionEnlace: "final" }, { texto: "", posicionEnlace: "middle" }, { texto: "", posicionEnlace: { toString: "final" } }]) {
    const response = await api.save(message);
    assert.equal(response.status, 400);
    assert.ok(response.body.error);
  }
  assert.equal(api.writes(), 0);
});

test("API requires admin access and reports storage errors", async () => {
  const unauthorized = configApi({ authorized: false });
  assert.equal((await unauthorized.save(helper.DEFAULT_INVITATION_MESSAGE)).status, 403);
  assert.equal(unauthorized.writes(), 0);
  const failing = configApi({ saveError: { message: "Database unavailable" } });
  const response = await failing.save(helper.DEFAULT_INVITATION_MESSAGE);
  assert.equal(response.status, 500);
  assert.equal(response.body.error, "Database unavailable");
});
