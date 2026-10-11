import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, imports, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (id) => {
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, ...globals });
  return exports;
}

function mount(response = { ok: true }) {
  const states = new Map();
  let scope;
  let cursor;
  const requests = [];
  const sheets = [];
  const jsx = (type, props) => ({ type, props });
  const component = load("../src/components/admin/InvitacionesView.tsx", {
    react: { useState(initial) {
      const key = `${scope}:${cursor++}`;
      if (!states.has(key)) states.set(key, typeof initial === "function" ? initial() : initial);
      return [states.get(key), (value) => states.set(key, typeof value === "function" ? value(states.get(key)) : value)];
    } },
    xlsx: {
      utils: {
        book_new: () => ({}),
        json_to_sheet: (rows) => rows,
        book_append_sheet: (_wb, rows, name) => sheets.push({ rows, name }),
      },
      write: () => new Uint8Array(),
    },
    "@/lib/rsvp-status": {},
    "@/lib/invitation-message": { composeInvitationMessage: () => "" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
  }, {
    fetch: async (...args) => { requests.push(args); if (response instanceof Error) throw response; return response; },
    Blob,
    URL: { createObjectURL: () => "blob:export" },
    document: { createElement: () => ({ click() {} }) },
  });
  const invitation = (id, enviada, estado) => ({
    id, enviada, estado, invite_code: id, nombre_visible: `Guest ${id}`, asistentes: [],
    adultos_estimados: 2, adolescentes_estimados: 0, ninos_estimados: 0, bebes_estimados: 0,
  });
  const props = {
    inviteCode: "ADMIN",
    invitaciones: [invitation("1", false, "pendiente"), invitation("2", true, "confirmada"), invitation("3", true, "pendiente")],
    unreadByInvitationId: {},
    mensajeInvitacion: { texto: "", posicionEnlace: "final" },
  };
  const render = (type, props, key) => { scope = key; cursor = 0; return type(props); };
  const all = (node, predicate) => {
    if (!node || typeof node !== "object") return [];
    return [...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap((child) => all(child, predicate))];
  };
  const tree = () => render(component.default, props, "main");
  const get = (predicate) => all(tree(), predicate)[0];
  const rows = () => all(tree(), (n) => typeof n.type === "function" && n.type.name === "InvitacionRow");
  const rowTree = (id) => {
    const row = rows().find((n) => n.props.inv.id === id);
    return render(row.type, row.props, id);
  };
  const checkbox = (id) => all(rowTree(id), (n) => n.type === "input" && n.props["aria-label"]?.startsWith("Invitación enviada:"))[0];
  return { get, rows, rowTree, checkbox, requests, all, sheets };
}

test("sent filter combines with response status and search without changing invitations", () => {
  const app = mount();
  const filter = () => app.get((n) => n.props["aria-label"] === "Filtrar por estado de envío");
  assert.equal(app.rows().length, 3);
  filter().props.onChange({ target: { value: "enviadas" } });
  assert.deepEqual(app.rows().map((n) => n.props.inv.id), ["2", "3"]);
  app.get((n) => n.type === "button" && n.props.children === "Pendientes").props.onClick();
  assert.deepEqual(app.rows().map((n) => n.props.inv.id), ["3"]);
  app.get((n) => n.type === "input" && n.props.type === "search").props.onChange({ target: { value: "Guest 2" } });
  assert.equal(app.rows().length, 0);
  app.get((n) => n.type === "input" && n.props.type === "search").props.onChange({ target: { value: "" } });
  filter().props.onChange({ target: { value: "sin_enviar" } });
  assert.deepEqual(app.rows().map((n) => n.props.inv.id), ["1"]);
});

test("individual checkbox persists both values, disables while saving and leaves RSVP unchanged", async () => {
  const app = mount();
  assert.equal(app.checkbox("1").props.checked, false);
  const saving = app.checkbox("1").props.onChange({ target: { checked: true } });
  assert.equal(app.checkbox("1").props.disabled, true);
  await saving;
  assert.equal(app.checkbox("1").props.checked, true);
  assert.equal(app.checkbox("1").props.disabled, false);
  assert.equal(app.rows()[0].props.inv.estado, "pendiente");
  await app.checkbox("1").props.onChange({ target: { checked: false } });
  assert.equal(app.checkbox("1").props.checked, false);
  assert.equal(app.requests[0][0], "/api/admin/ADMIN/invitaciones/1");
  assert.equal(app.requests[0][1].method, "PATCH");
  assert.deepEqual(app.requests.map((r) => JSON.parse(r[1].body)), [{ enviada: true }, { enviada: false }]);
});

test("failed persistence surfaces an error and preserves the previous checkbox state", async () => {
  for (const response of [{ ok: false, json: async () => ({ error: "Storage error" }) }, new Error("Offline")]) {
    const app = mount(response);
    await app.checkbox("1").props.onChange({ target: { checked: true } });
    assert.equal(app.checkbox("1").props.checked, false);
    assert.equal(app.checkbox("1").props.disabled, false);
    assert.ok(app.all(app.rowTree("1"), (n) => n.props.role === "alert")[0]);
  }
});

test("list exports include the sent state and honor the sent filter", () => {
  const app = mount();
  app.get((n) => n.props["aria-label"] === "Filtrar por estado de envío").props.onChange({ target: { value: "enviadas" } });
  app.get((n) => n.type === "button" && Array.isArray(n.props.children) && n.props.children[0] === "Exportar ").props.onClick();
  app.get((n) => n.type === "button" && n.props.children === "Excel (.xlsx)").props.onClick();
  const rows = app.sheets.find((s) => s.name === "Invitaciones").rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.Enviada === "Si"));
});

function api({ authorized = true, error = null, exists = true } = {}) {
  const writes = [];
  const route = load("../src/app/api/admin/[inviteCode]/invitaciones/[invitacionId]/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/admin-auth": { validateAdminCode: async () => authorized },
    "@/lib/supabase/server": { createServerClient: () => ({ from: (table) => {
      assert.equal(table, "invitaciones");
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: exists ? { adultos_estimados: 0 } : null }) }) }),
        update: (patch) => ({ eq: async () => { writes.push(patch); return { error }; } }),
      };
    } }) },
    "@/lib/rsvp-limits": {},
    "@/lib/wedding-config-server": { getWeddingConfig: () => { throw new Error("Sent-only updates must not check RSVP limits"); } },
  });
  return {
    patch: (body) => route.PATCH({ json: async () => body }, { params: Promise.resolve({ inviteCode: "ADMIN", invitacionId: "1" }) }),
    writes,
  };
}

test("API saves true and false without changing other fields or checking RSVP limits", async () => {
  const app = api();
  for (const enviada of [true, false]) assert.equal((await app.patch({ enviada })).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(app.writes)), [{ enviada: true }, { enviada: false }]);
});

test("API rejects non-boolean sent states and requires admin authorization", async () => {
  const app = api();
  for (const enviada of ["true", 1, 0, null, [], {}]) {
    assert.equal((await app.patch({ enviada })).status, 400);
  }
  assert.equal(app.writes.length, 0);
  const denied = api({ authorized: false });
  assert.equal((await denied.patch({ enviada: true })).status, 403);
  assert.equal(denied.writes.length, 0);
});

test("API reports missing invitations and database write failures", async () => {
  assert.equal((await api({ exists: false }).patch({ enviada: true })).status, 404);
  const result = await api({ error: { message: "Missing migration" } }).patch({ enviada: true });
  assert.equal(result.status, 500);
  assert.equal(result.body.error, "Missing migration");
});

test("schema and migration persist a non-null false default and list loads it", () => {
  for (const path of ["../supabase/schema.sql", "../supabase/reset-schema.sql", "../supabase/migrations/20261011_invitation_sent.sql"]) {
    assert.match(readFileSync(new URL(path, import.meta.url), "utf8"), /enviada\s+boolean not null default false/);
  }
  assert.match(readFileSync(new URL("../src/app/admin/[inviteCode]/invitaciones/page.tsx", import.meta.url), "utf8"), /estado,\s+enviada,/);
});

test("server Excel export includes sent flags and surfaces read errors", async () => {
  for (const error of [null, { message: "Database unavailable" }]) {
    const sheets = [];
    class NextResponse {
      static json(body, options) { return { body, status: options?.status ?? 200 }; }
    }
    const route = load("../src/app/api/admin/[inviteCode]/export/route.ts", {
      "next/server": { NextResponse },
      xlsx: {
        utils: {
          book_new: () => ({}),
          json_to_sheet: (rows) => rows,
          book_append_sheet: (_wb, rows, name) => sheets.push({ rows, name }),
        },
        write: () => new Uint8Array(),
      },
      "@/lib/admin-auth": { validateAdminCode: async () => true },
      "@/lib/supabase/server": { createServerClient: () => ({
        from: () => ({ select: (query) => {
          assert.match(query, /estado,\s+enviada,/);
          return { neq: () => ({ order: async () => ({
            error,
            data: error ? null : [true, false].map((enviada) => ({
              enviada, estado: "pendiente", asistentes: [{ estado_asistencia: "pendiente" }],
            })),
          }) }) };
        } }),
      }) },
    });
    const result = await route.GET({}, { params: Promise.resolve({ inviteCode: "ADMIN" }) });
    if (error) {
      assert.equal(result.status, 500);
      assert.equal(result.body.error, error.message);
      assert.equal(sheets.length, 0);
    } else {
      assert.deepEqual(Array.from(sheets.find((s) => s.name === "Invitaciones").rows, (row) => row.Enviada), ["Sí", "No"]);
      assert.deepEqual(Array.from(sheets.find((s) => s.name === "Asistentes").rows, (row) => row["Invitación enviada"]), ["Sí", "No"]);
    }
  }
});
