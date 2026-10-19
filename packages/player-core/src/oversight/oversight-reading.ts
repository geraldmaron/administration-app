import {
  INSPECTED_INSTITUTIONS,
  inspectorIsSeated,
  institutionDef,
  isMatterOpen,
  selectInspector,
  selectMattersFor,
  type Campaign,
  type InstitutionDef,
  type InstitutionId,
} from "@admin/engine";
import type { Stance } from "../reading.js";

export type InspectionRow = {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly stance?: Stance;
};

export type OversightReading = {
  readonly auditedBy: InstitutionId;
  readonly caption: string;
  readonly rows: readonly InspectionRow[];
  readonly detail: string;
  readonly direct: boolean;
};

function auditedBy(def: InstitutionDef): InstitutionDef | undefined {
  let current: InstitutionDef | undefined = def;
  while (current) {
    if (INSPECTED_INSTITUTIONS.includes(current.id)) return current;
    current = current.parent ? institutionDef(current.parent) : undefined;
  }
  return undefined;
}

function inspectorStatus(campaign: Campaign, institutionId: InstitutionId): InspectionRow {
  const inspector = selectInspector(campaign, institutionId);
  if (!inspector) return { key: "inspector", label: "Inspector", value: "No inspector general", stance: "caution" };
  if (!inspectorIsSeated(inspector)) return { key: "inspector", label: "Inspector", value: "Vacant", stance: "adverse" };
  if (inspector.noticeFiledTurn !== undefined) {
    return { key: "inspector", label: "Inspector", value: "Notice of removal filed", stance: "adverse" };
  }
  return { key: "inspector", label: "Inspector", value: "In post" };
}

/**
 * The audit posture this office actually has in the campaign: its own board
 * where the engine tracks one, otherwise the charter fact of which parent's
 * inspector general watches it.
 */
export function oversightReading(
  campaign: Campaign,
  institution: InstitutionDef,
): OversightReading | undefined {
  const owner = auditedBy(institution);
  if (!owner) return undefined;
  const direct = owner.id === institution.id;
  const openMatters = direct ? selectMattersFor(campaign, owner.id).filter(isMatterOpen) : [];
  const rows: InspectionRow[] = [
    {
      key: "matters",
      label: "Open investigations",
      value: direct ? String(openMatters.length) : "Handled by the parent department",
      ...(direct && openMatters.length > 0 ? { stance: openMatters.length > 1 ? "adverse" : "caution" as const } : {}),
    },
    inspectorStatus(campaign, owner.id),
  ];
  return {
    auditedBy: owner.id,
    caption: `The inspector general of ${owner.name} is the in-house watchdog who checks this office's work.`,
    rows,
    detail: direct
      ? openMatters[0]
        ? `Latest open investigation: ${openMatters[0].subject}`
        : "Nobody is investigating this agency right now."
      : `The inspector general of ${owner.name} checks this office. Open that department to see any investigation.`,
    direct,
  };
}

export type OfficeOversightGlance = {
  readonly figure: string;
  readonly detail: string;
  readonly stance: Stance;
  readonly value: number;
};

