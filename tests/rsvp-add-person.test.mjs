import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadForm(tipoInvitacion) {
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
      });
    },
  };
}

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
