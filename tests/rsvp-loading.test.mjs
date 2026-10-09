import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(relativePath, results = []) {
  const errors = [];
  const queries = [];
  const reloads = [];
  const exports = {};
  const imports = {
    "@/lib/supabase/server": {
      createServerClient() {
        return {
          from(table) {
            queries.push(table);
            const result = results.shift();
            const query = {
              select: () => query,
              eq: () => query,
              maybeSingle: async () => {
                if (result instanceof Error) throw result;
                return result;
              },
              order: async () => result,
            };
            return query;
          },
        };
      },
    },
    "next/navigation": { notFound() { throw new Error("NOT_FOUND"); } },
    "next/server": {
      NextResponse: {
        json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: init.headers }),
      },
    },
    "@/lib/wedding-config-server": { getWeddingConfig: async () => ({ diseno: {}, rsvp: {} }) },
    "@/components/wedding/InviteRsvpForm": { InviteRsvpForm: "Form" },
    "@/components/layout/WeddingViewport": { default: "Viewport" },
    "@/lib/rsvp-status": { computeInvitacionEstado() {} },
    "@/lib/rsvp-limits": {},
    react: { useEffect: (effect) => effect() },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
  };
  const compiled = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
    console: { error: (...args) => errors.push(args) },
    window: { location: { reload: () => reloads.push(true) } },
  });
  return { exports, errors, queries, reloads };
}

const params = Promise.resolve({ inviteCode: "TEST" });
const invitation = {
  id: "invitation-id", nombre_visible: "Invitados", nombre1: "Nombre",
  tipo_invitacion: "pareja", adultos_estimados: 2,
};
const dbError = { message: "private database failure", code: "XX000" };

for (const path of ["../src/app/rsvp/[inviteCode]/page.tsx", "../src/app/[inviteCode]/page.tsx"]) {
  test(`${path}: only an absent invitation produces notFound`, async () => {
    const missing = load(path, [{ data: null, error: null }]);
    await assert.rejects(missing.exports.default({ params }), /NOT_FOUND/);
    assert.equal(missing.errors.length, 0);
    const failed = load(path, [{ data: null, error: dbError }]);
    await assert.rejects(failed.exports.default({ params }), /No se pudo cargar/);
    assert.equal(failed.errors.length, 1);
    assert.deepEqual(failed.queries, ["invitaciones"]);
  });

  test(`${path}: attendee read failures never render an empty form`, async () => {
    const failed = load(path, [
      { data: invitation, error: null },
      { data: null, error: dbError },
    ]);
    await assert.rejects(failed.exports.default({ params }), /No se pudieron cargar los asistentes/);
    assert.equal(failed.errors.length, 1);
  });

  test(`${path}: valid new and existing invitations still render`, async () => {
    for (const attendees of [[], [{
      id: "person-id", nombre: "Nombre", tipo_persona: "adulto",
      estado_asistencia: "si", transporte: ["granada-beas", null],
    }]]) {
      const app = load(path, [
        { data: invitation, error: null },
        { data: attendees, error: null },
      ]);
      const result = await app.exports.default({ params });
      const form = result.props.children.props;
      assert.equal(form.inviteCode, "TEST");
      assert.equal(form.personas.length, attendees.length || 2);
      if (attendees.length) {
        assert.equal(form.personas[0].id, "person-id");
        assert.deepEqual(Array.from(form.personas[0].transporte), ["granada-beas"]);
      }
    }
  });
}

const apiPath = "../src/app/api/rsvp/[inviteCode]/route.ts";
for (const method of ["GET", "POST"]) {
  test(`${method}: database errors return 503, not a false 404`, async () => {
    const request = { json: async () => ({ personas: [] }) };
    const failed = load(apiPath, [{ data: null, error: dbError }]);
    const response = await failed.exports[method](request, { params });
    assert.equal(response.status, 503);
    assert.equal(failed.errors.length, 1);
    assert.ok(!JSON.stringify(response.body).includes(dbError.message));
    assert.deepEqual(failed.queries, ["invitaciones"]);
    const missing = load(apiPath, [{ data: null, error: null }]);
    assert.equal((await missing.exports[method](request, { params })).status, 404);
  });
}

test("GET: successful responses are not cached and attendee failures are explicit", async () => {
  const app = load(apiPath, [
    { data: invitation, error: null },
    { data: [], error: null },
  ]);
  const response = await app.exports.GET({}, { params });
  assert.equal(response.status, 200);
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.equal(response.body.invitacion.id, invitation.id);
  const failed = load(apiPath, [
    { data: invitation, error: null },
    { data: null, error: dbError },
  ]);
  assert.equal((await failed.exports.GET({}, { params })).status, 503);
  assert.equal(failed.errors.length, 1);
});

test("GET: unexpected network failures are logged and return a retryable error", async () => {
  const app = load(apiPath, [new Error("network unavailable")]);
  const response = await app.exports.GET({}, { params });
  assert.equal(response.status, 503);
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.equal(app.errors.length, 1);
});

test("RSVP error screen reports the failure and retries with a fresh document", () => {
  const app = load("../src/components/wedding/RsvpLoadError.tsx");
  const screen = app.exports.default({ error: new Error("load failed") });
  const alert = screen.props.children;
  assert.equal(alert.props.role, "alert");
  const retry = alert.props.children.find((child) => child.type === "button");
  assert.equal(retry.props.children, "Reintentar");
  retry.props.onClick();
  assert.equal(app.reloads.length, 1);
  assert.equal(app.errors.length, 1);
});
