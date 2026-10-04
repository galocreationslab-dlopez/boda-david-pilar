import type { PersonaTipo } from "@/types/rsvp";

export type RsvpLimits = Record<PersonaTipo, number>;

export const RSVP_PERSONA_TYPES: PersonaTipo[] = ["adulto", "adolescente", "nino", "bebe"];

export function getRsvpLimits(invitation: {
  adultos_estimados?: number | null;
  adolescentes_estimados?: number | null;
  ninos_estimados?: number | null;
  bebes_estimados?: number | null;
}): RsvpLimits {
  return {
    adulto: Math.max(0, Number(invitation.adultos_estimados ?? 0)),
    adolescente: Math.max(0, Number(invitation.adolescentes_estimados ?? 0)),
    nino: Math.max(0, Number(invitation.ninos_estimados ?? 0)),
    bebe: Math.max(0, Number(invitation.bebes_estimados ?? 0)),
  };
}

export function countRsvpPeople(people: Array<{ tipo_persona?: string | null }>): RsvpLimits {
  const counts: RsvpLimits = { adulto: 0, adolescente: 0, nino: 0, bebe: 0 };
  for (const person of people) {
    if (RSVP_PERSONA_TYPES.includes(person.tipo_persona as PersonaTipo)) {
      counts[person.tipo_persona as PersonaTipo] += 1;
    }
  }
  return counts;
}

export function exceedsRsvpLimits(counts: RsvpLimits, limits: RsvpLimits): PersonaTipo | null {
  return RSVP_PERSONA_TYPES.find((type) => counts[type] > limits[type]) ?? null;
}
