import type { SeccionDiseno } from "../config/wedding.config";

export type SectionGroup = {
  head: SeccionDiseno;
  sections: SeccionDiseno[];
};

export function canLeadSectionChain(section: SeccionDiseno): boolean {
  return section.tipo !== "intro"
    && section.tipo !== "portada"
    && section.tipo !== "invitacion"
    && (section.tipo !== "portadaLibre" || section.portadaLibre?.colapsable !== false);
}

export function buildSectionGroups(sections: SeccionDiseno[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const section of sections) {
    const previous = groups[groups.length - 1];
    if (section.encadenarAnterior === true && section.tipo !== "intro" && previous && canLeadSectionChain(previous.head)) {
      previous.sections.push(section);
    } else {
      groups.push({ head: section, sections: [section] });
    }
  }
  return groups;
}

export function normalizeSectionChains(sections: SeccionDiseno[]): SeccionDiseno[] {
  return buildSectionGroups(sections).flatMap((group) => group.sections.map((section, index) => ({
    ...section,
    encadenarAnterior: index > 0,
  })));
}

export function preserveSectionChainNeighbors(previous: SeccionDiseno[], next: SeccionDiseno[]): SeccionDiseno[] {
  const predecessors = new Map(previous.map((section, index) => [section.id, previous[index - 1]?.id]));
  return normalizeSectionChains(next.map((section, index) => ({
    ...section,
    encadenarAnterior: section.encadenarAnterior === true
      && predecessors.has(section.id)
      && predecessors.get(section.id) === next[index - 1]?.id,
  })));
}

export function getPublicSectionGroups(sections: SeccionDiseno[]): SectionGroup[] {
  return getSectionGroupsForProfile(sections, "publico");
}

export function getSectionGroupsForProfile(sections: SeccionDiseno[], profile: string): SectionGroup[] {
  const isPublic = (section: SeccionDiseno) => !section.perfiles?.length || section.perfiles.includes("publico") || section.perfiles.includes(profile);
  return buildSectionGroups(sections)
    .filter((group) => isPublic(group.head))
    .map((group) => ({
      ...group,
      sections: group.sections.filter((section, index) => index === 0 || (section.visible && isPublic(section))),
    }));
}

export function getSectionAnchor(section: Pick<SeccionDiseno, "tipo" | "id">): string {
  const legacy = getLegacySectionAnchor(section);
  return section.tipo === "carrusel" || section.tipo === "portadaLibre" ? legacy : `${legacy}-${section.id}`;
}

export function getLegacySectionAnchor(section: Pick<SeccionDiseno, "tipo" | "id">): string {
  if (section.tipo === "carrusel") return `carrusel-${section.id}`;
  if (section.tipo === "portadaLibre") return `portada-${section.id}`;
  if (section.tipo === "invitacion" || section.tipo === "portada") return "invitacion";
  if (section.tipo === "historia") return "historia";
  if (section.tipo === "galeria") return "galeria";
  return "timeline";
}