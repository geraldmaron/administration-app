import {
  institutionChildren,
  institutionDef,
  type Campaign,
  type InstitutionDef,
} from "@admin/engine";
import { subjectHref } from "../shell/subject.js";
import { bodyLoad, type LoadNode } from "../institution/office-load.js";

export type OrganogramRelation = "parent" | "peer" | "component";

export type OrganogramEntry = {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly relation: OrganogramRelation;
  readonly title: string;
  readonly load?: LoadNode;
};

export type OrganogramSection = {
  readonly key: OrganogramRelation;
  readonly title: string;
  readonly entries: readonly OrganogramEntry[];
};

function leadOfficeHref(def: InstitutionDef): string | undefined {
  const officeId = def.offices[0]?.id;
  return officeId ? subjectHref({ kind: "office", id: officeId }) : undefined;
}

function organogramEntry(
  campaign: Campaign,
  def: InstitutionDef,
  relation: OrganogramRelation,
): OrganogramEntry | undefined {
  const href = leadOfficeHref(def);
  if (!href) return undefined;
  const office = def.offices[0]!;
  const runtime = campaign.institutions[def.id];
  return {
    key: def.id,
    label: def.name,
    href,
    relation,
    title: office.title,
    ...(runtime ? { load: bodyLoad(runtime) } : {}),
  };
}

function organogramSection(
  campaign: Campaign,
  defs: readonly InstitutionDef[],
  relation: OrganogramRelation,
  title: string,
): OrganogramSection | undefined {
  const entries = defs
    .flatMap((def) => {
      const entry = organogramEntry(campaign, def, relation);
      return entry ? [entry] : [];
    })
    .sort((left, right) => left.label.localeCompare(right.label));
  return entries.length === 0 ? undefined : { key: relation, title, entries };
}

/**
 * The bodies already named around this one: the parent it answers to, the peer
 * bodies that share that parent, and the components that answer here.
 */
export function officeOrganogram(
  campaign: Campaign,
  institution: InstitutionDef,
): readonly OrganogramSection[] {
  const sections: OrganogramSection[] = [];
  const parent = institution.parent ? institutionDef(institution.parent) : undefined;
  if (parent) {
    const parentSection = organogramSection(campaign, [parent], "parent", "Answers to");
    if (parentSection) sections.push(parentSection);
    const peers = institutionChildren(parent.id).filter((entry) => entry.id !== institution.id);
    const peerSection = organogramSection(campaign, peers, "peer", "Other offices under the same boss");
    if (peerSection) sections.push(peerSection);
  }
  const components = institutionChildren(institution.id);
  const componentSection = organogramSection(campaign, components, "component", "Offices that report here");
  if (componentSection) sections.push(componentSection);
  return sections;
}
