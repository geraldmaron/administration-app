import {
  US_NAME_GROUPS,
  nameGroupForHeritage,
  type NameGroup,
  type PortraitGenderPresentation,
  type PortraitHeritage,
} from "@admin/world";

// "Suggest a name" draws from the same American name groups the rest of the
// cast is named from, so a suggested President sounds like someone the bench
// could have produced. A face already chosen names the group; otherwise the
// groups are drawn by their census weight.

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length]!;
}

function weightedGroup(random: () => number): NameGroup {
  const groups = Object.values(US_NAME_GROUPS);
  const total = groups.reduce((sum, group) => sum + group.weight, 0);
  let target = random() * total;
  return groups.find((group) => (target -= group.weight) <= 0) ?? groups[0]!;
}

function givenNames(group: NameGroup, presentation: PortraitGenderPresentation | undefined, random: () => number): readonly string[] {
  if (presentation === "masculine") return group.given.masculine;
  if (presentation === "feminine") return group.given.feminine;
  if (presentation === "androgynous") return group.given.neutral;
  return pick([group.given.masculine, group.given.feminine], random);
}

export function suggestName(
  presentation: PortraitGenderPresentation | undefined,
  heritage: PortraitHeritage | undefined,
  random: () => number = Math.random,
): string {
  const group = (heritage ? nameGroupForHeritage("american", heritage) : undefined) ?? weightedGroup(random);
  return `${pick(givenNames(group, presentation, random), random)} ${pick(group.surname, random)}`;
}
