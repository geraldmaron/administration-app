import { institutionDef, type InstitutionId } from "@admin/engine";

// The glyph an office wears beside its name, from the icon set: the
// department's own emblem where the set draws one, else the kind of body it is.
// A glyph name here is a string because player-core draws nothing; the web
// checks it against the set before it renders.

const GLYPH_BY_INSTITUTION: Readonly<Record<string, string>> = {
  "INST-PRESIDENCY": "westWing",
  "INST-STATE": "departmentState",
  "INST-TREASURY": "departmentTreasury",
  "INST-DOD": "departmentDefense",
  "INST-DOJ": "departmentJustice",
  "INST-INTERIOR": "departmentInterior",
  "INST-USDA": "sectorAgriculture",
  "INST-COMMERCE": "departmentCommerce",
  "INST-LABOR": "departmentLabor",
  "INST-HHS": "departmentHealthHumanServices",
  "INST-HUD": "departmentHousingUrban",
  "INST-DOT": "departmentTransportation",
  "INST-DOE": "departmentEnergy",
  "INST-ED": "departmentEducation",
  "INST-VA": "departmentVeteransAffairs",
  "INST-DHS": "departmentHomelandSecurity",
  "INST-OMB": "departmentBudget",
  "INST-USTR": "subjectTrade",
  "INST-EPA": "departmentEnvironment",
  "INST-FBI": "departmentInvestigation",
  "INST-FED": "departmentCentralBank",
  "INST-NSC": "departmentNationalSecurity",
};

const GLYPH_BY_OFFICE: Readonly<Record<string, string>> = {
  "OFF-NSA-ADVISOR": "departmentNationalSecurity",
  "OFF-CHIEF-OF-STAFF": "westWing",
};

const GLYPH_BY_KIND: Readonly<Record<string, string>> = {
  intelligence: "intel",
  military: "shield",
  regulator: "gavel",
  "independent-agency": "gavel",
  "executive-office": "westWing",
};

/** The glyph for an office: its own, its body's, or its kind's, and a building where none says more. */
export function officeEmblem(institution: InstitutionId, office?: string): string {
  const own = office ? GLYPH_BY_OFFICE[office] : undefined;
  if (own) return own;
  const body = GLYPH_BY_INSTITUTION[institution as string];
  if (body) return body;
  const kind = institutionDef(institution)?.kind;
  return (kind ? GLYPH_BY_KIND[kind] : undefined) ?? "building";
}

const GLYPH_BY_ROLE: Readonly<Record<string, string>> = {
  "role-attorney-general": "departmentJustice",
  "role-commerce-secretary": "departmentCommerce",
  "role-defense-minister": "departmentDefense",
  "role-energy-secretary": "departmentEnergy",
  "role-foreign-minister": "departmentState",
  "role-health-secretary": "departmentHealthHumanServices",
  "role-homeland-secretary": "departmentHomelandSecurity",
  "role-intelligence-director": "intel",
  "role-treasury-minister": "departmentTreasury",
  "role-veterans-secretary": "departmentVeteransAffairs",
};

/**
 * The glyph for whoever an act consults: a cabinet chair by its department, a
 * body by what it is. The bodies are sentences, so they are read by their
 * opening words; anything unrecognized wears a building rather than a guess.
 */
export function consulteeEmblem(consultee: { readonly roleId: string } | { readonly body: string }): string {
  if ("roleId" in consultee) return GLYPH_BY_ROLE[consultee.roleId] ?? "building";
  const body = consultee.body;
  if (/^(Congress|The Senate|The [a-z ]+committees)/.test(body)) return "subjectCapitol";
  if (/^(Allied capitals|The host government)/.test(body)) return "flag";
  if (/^Counsel/.test(body)) return "gavel";
  return "building";
}
