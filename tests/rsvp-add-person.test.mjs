import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadForm(tipoInvitacion, overrides = {}) {
  const states = [];
  let cursor = 0;
  const texts = {
    addAdultoLabel: "Adult",
    addAcompananteLabel: "Companion",
    addNinoLabel: "Child",
  };
  const imports = {
    react: {
      useEffect() {},
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], (value) => {
          states[index] = typeof value === "function" ? value(states[index]) : value;
        }];
      },
    },
    "next/link": { default: "Link" },
    "./InviteExtras": { InviteExtras: "Extras" },
    "@/config/wedding.config": {
      DEFAULT_RSVP_TEXTOS_FORMULARIO: texts,
      mergeRsvpTextos: (defaults) => defaults,
    },
    "@/lib/rsvp-limits": { getRsvpLimits: () => ({ adulto: 3, nino: 3 }) },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
  };
  const exports = {};
  const compiled = ts.transpileModule(
    readFileSync(new URL("../src/components/wedding/InviteRsvpForm.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      assert.ok(id in imports, `Unexpected import: ${id}`);
      return imports[id];
    },
  });
  return {
    states,
    render() {
      cursor = 0;
      return exports.InviteRsvpForm({
        inviteCode: "TEST",
        invitacion: { nombre_visible: "Existing guest", tipo_invitacion: tipoInvitacion },
        personas: [{
          id: "existing",
          nombre: "Existing",
          apellidos: "Guest",
          tipo_persona: "adulto",
          necesidades: { alojamiento: "Hotel", alergias: "Nuts" },
          transporte: ["granada-beas", "beas-torre", "torre-granada"],
        }],
        ...overrides,
      });
    },
  };
}

for (const autoRellenarInvitados of [undefined, false, true]) {
  test(`initial invitation rows respect auto-fill=${autoRellenarInvitados}`, () => {
    const app = loadForm("familia", {
      rsvpConfig: { autoRellenarInvitados },
      personas: ["adulto", "adulto", "adolescente", "nino", "bebe"].map((tipo_persona, index) => ({
        id: "",
        nombre: index < 2 ? `Nombre${index} Apellido` : "",
        tipo_persona,
        estado_asistencia: "pendiente",
      })),
    });
    app.render();
    assert.equal(app.states[1].length, 5);
    assert.deepEqual(Array.from(app.states[1], (p) => p.tipo_persona),
      ["adulto", "adulto", "adolescente", "nino", "bebe"]);
    for (const [index, person] of app.states[1].entries()) {
      assert.equal(person.nombre, autoRellenarInvitados && index < 2 ? `Nombre${index}` : "");
      assert.equal(person.apellidos, autoRellenarInvitados && index < 2 ? "Apellido" : "");
      assert.equal(person.asistira, "pendiente");
    }
  });

  for (const tipo_invitacion of ["pareja", "soltero"]) {
    for (const nombres of [{ nombre1: "Ana", nombre2: "Luis" }, {}]) {
      test(`${tipo_invitacion} fallback respects auto-fill=${autoRellenarInvitados} with ${JSON.stringify(nombres)}`, () => {
        const app = loadForm(tipo_invitacion, {
          rsvpConfig: { autoRellenarInvitados },
          invitacion: { nombre_visible: "Invitados", tipo_invitacion, ...nombres },
          personas: [],
        });
        app.render();
        const expectedNames = nombres.nombre1
          ? tipo_invitacion === "pareja" ? ["Ana", "Luis"] : ["Ana"]
          : ["Invitados"];
        assert.deepEqual(Array.from(app.states[1], (p) => p.nombre),
          autoRellenarInvitados ? expectedNames : expectedNames.map(() => ""));
      });
    }
  }

  test(`saved responses remain intact with auto-fill=${autoRellenarInvitados}`, () => {
    const app = loadForm("pareja", { rsvpConfig: { autoRellenarInvitados } });
    app.render();
    const person = app.states[1][0];
    assert.equal(person.id, "existing");
    assert.equal(person.nombre, "Existing");
    assert.equal(person.apellidos, "Guest");
    assert.equal(person.alojamiento, "Hotel");
    assert.equal(person.alergias, "Nuts");
    assert.equal(person.transporte_g_to_b, true);
    assert.equal(person.transporte_b_to_t, true);
    assert.equal(person.transporte_t_to_g, true);
  });
}

test("RSVP normalization defaults auto-fill off and preserves explicit settings", () => {
  const path = "../src/lib/wedding-config-server.ts";
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const declaration = file.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === "normalizeRsvpConfig");
  assert.ok(declaration);
  const compiled = ts.transpileModule(`${declaration.getText(file)}; exports.normalize = normalizeRsvpConfig;`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    isRecord: (value) => value !== null && typeof value === "object" && !Array.isArray(value),
    normalizeRsvpFormTextos: (value) => value ?? {},
    normalizeRsvpChatTextos: (value) => value ?? {},
  });
  for (const rsvp of [undefined, {}, { autoRellenarInvitados: false }, { autoRellenarInvitados: true }]) {
    const normalized = exports.normalize({ rsvp }).rsvp;
    assert.equal(normalized.autoRellenarInvitados, rsvp?.autoRellenarInvitados === true);
    assert.equal(normalized.mostrarChat, true);
    assert.equal(normalized.mostrarCupos, true);
    assert.equal(normalized.cuposLimitantes, true);
    assert.equal(exports.normalize({ rsvp: normalized }).rsvp.autoRellenarInvitados,
      normalized.autoRellenarInvitados);
  }
});

function findButton(node, label) {
  if (!node || typeof node !== "object") return undefined;
  if (node.type === "button" && node.props.children?.[0] === label) return node;
  const children = Array.isArray(node) ? node : node.props?.children;
  for (const child of [children].flat()) {
    const found = findButton(child, label);
    if (found) return found;
  }
}

for (const [invitationType, label, personType] of [
  ["pareja", "Adult", "adulto"],
  ["soltero", "Companion", "adulto"],
  ["pareja", "Child", "nino"],
]) {
  test(`adding ${label} leaves fields empty and preserves existing guests`, () => {
    const app = loadForm(invitationType);
    const tree = app.render();
    const existing = { ...app.states[1][0] };
    const button = findButton(tree, label);
    assert.ok(button);
    assert.equal(button.props.disabled, false);
    button.props.onClick();
    app.render();
    const people = app.states[1];
    assert.equal(people.length, 2);
    assert.deepEqual({ ...people[0] }, existing);
    assert.equal(people[1].tipo_persona, personType);
    for (const field of ["nombre", "apellidos", "edad", "alergias", "necesidades_alimentarias", "alojamiento"]) {
      assert.equal(people[1][field], "", field);
    }
    for (const field of ["transporte_g_to_b", "transporte_b_to_t", "transporte_t_to_g", "come_con_padres"]) {
      assert.equal(people[1][field], false, field);
    }
  });
}
