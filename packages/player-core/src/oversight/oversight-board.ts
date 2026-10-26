import {
  campaignDay,
  conclusoryAccount,
  fileInspectorRemovalNotice,
  INSPECTED_INSTITUTIONS,
  igRemovalNoticeTurns,
  inspectorIsSeated,
  institutionDef,
  isMatterOpen,
  matterRipensTurn,
  matterSource,
  notifyCommittees,
  selectDateOfTurn,
  selectFindings,
  selectInspector,
  selectMattersFor,
  selectNation,
  selectOversightPressure,
  type Campaign,
  type EffectPacket,
  type FindingId,
  type InstitutionId,
  type MatterStage,
  type OversightMatter,
} from "@admin/engine";
import { federalSitePoint } from "@admin/world";
import { formatDate } from "../format/figures";

// The oversight board: every inquiry running into or out of the government,
// the inspectors general in post with what removing one would cost, and the
// notices the law says the President owes the committees. Every price is read
// off the packet the act would commit.

export const MATTER_STAGE_ORDER: readonly MatterStage[] = ["opened", "gathering", "reported", "closed"];

export const MATTER_STAGE_WORDS: Readonly<Record<MatterStage, string>> = {
  opened: "Opened, not yet public",
  gathering: "Gathering documents",
  reported: "Reported",
  closed: "Closed",
};

export type InquiryRow = {
  readonly id: string;
  readonly source: string;
  readonly subject: string;
  readonly stage: MatterStage;
  readonly stageWord: string;
  /** Oversight of your administration, or a review you directed. */
  readonly received: boolean;
  readonly public: boolean;
  readonly obstructed: boolean;
  readonly opened: string;
  /** When it next moves on its own; absent once closed. */
  readonly nextMove?: string;
  /** The body audited, where an inspector general opened it. */
  readonly institution?: InstitutionId;
  readonly latest: string;
};

export type InquiryPipeline = {
  /** Open matters by stage, in the order a matter moves through them. */
  readonly stages: readonly { readonly stage: MatterStage; readonly label: string; readonly matters: readonly InquiryRow[] }[];
  readonly closed: readonly InquiryRow[];
  /** How much the standing oversight of this administration weighs on the Hill, 0..1, the term Congress's mood reads. */
  readonly pressure: number;
};

function inquiryRow(campaign: Campaign, matter: OversightMatter): InquiryRow {
  const next = matterRipensTurn(matter);
  return {
    id: matter.id,
    source: matterSource(matter),
    subject: matter.subject,
    stage: matter.stage,
    stageWord: MATTER_STAGE_WORDS[matter.stage],
    received: matter.direction === "received",
    public: matter.public,
    obstructed: matter.obstructed,
    opened: formatDate(selectDateOfTurn(campaign, matter.openedTurn)),
    ...(next !== undefined ? { nextMove: formatDate(selectDateOfTurn(campaign, next)) } : {}),
    ...(matter.origin.kind === "inspector-general" ? { institution: matter.origin.institution } : {}),
    latest: matter.beats.at(-1)?.description ?? matter.subject,
  };
}

/** Every inquiry, open ones by stage and the closed ones newest first. */
export function inquiryPipeline(campaign: Campaign): InquiryPipeline {
  const rows = campaign.oversight.matters.map((matter) => inquiryRow(campaign, matter));
  return {
    stages: MATTER_STAGE_ORDER.filter((stage) => stage !== "closed").map((stage) => ({
      stage,
      label: MATTER_STAGE_WORDS[stage],
      matters: rows.filter((row) => row.stage === stage),
    })),
    closed: rows.filter((row) => row.stage === "closed").reverse(),
    pressure: selectOversightPressure(campaign),
  };
}

export type InquiryPin = {
  readonly id: string;
  readonly institution: InstitutionId;
  readonly label: string;
  readonly where: string;
  readonly lon: number;
  readonly lat: number;
  /** Ranks pins when more are in view than the map shows: later stages first. */
  readonly weight: number;
};

/** One pin per agency an open inquiry is auditing, at its sourced headquarters. */
export function inquiryPins(campaign: Campaign): readonly InquiryPin[] {
  const open = campaign.oversight.matters.filter((matter) => isMatterOpen(matter) && matter.origin.kind === "inspector-general");
  const byInstitution = new Map<InstitutionId, OversightMatter[]>();
  for (const matter of open) {
    if (matter.origin.kind !== "inspector-general") continue;
    byInstitution.set(matter.origin.institution, [...(byInstitution.get(matter.origin.institution) ?? []), matter]);
  }
  return [...byInstitution.entries()].flatMap(([institution, matters]) => {
    const point = federalSitePoint(institution);
    const def = institutionDef(institution);
    if (!point || !def) return [];
    const furthest = Math.max(...matters.map((matter) => MATTER_STAGE_ORDER.indexOf(matter.stage)));
    return [{ id: `inquiry:${institution}`, institution, label: `Inquiry at ${def.name}`, where: def.name, lon: point.lon, lat: point.lat, weight: furthest + 1 }];
  });
}

/** Where the inspector general stands, in the words the board prints. */
export type InspectorPosture = "in-post" | "notice-filed" | "removed";

export type InspectorRow = {
  readonly institution: InstitutionId;
  readonly name: string;
  readonly posture: InspectorPosture;
  readonly openMatters: number;
  readonly seated: string;
  /** The day the office empties, once notice is filed. */
  readonly leaves?: string;
  readonly reasons: readonly string[];
};

function postureOf(campaign: Campaign, institution: InstitutionId): InspectorPosture | undefined {
  const inspector = selectInspector(campaign, institution);
  if (!inspector) return undefined;
  if (!inspectorIsSeated(inspector)) return "removed";
  return inspector.noticeFiledTurn !== undefined ? "notice-filed" : "in-post";
}

/** Every inspector general the government has, those with audits running first. */
export function inspectorsBoard(campaign: Campaign): readonly InspectorRow[] {
  return INSPECTED_INSTITUTIONS.flatMap((institution): InspectorRow[] => {
    const inspector = selectInspector(campaign, institution);
    const posture = postureOf(campaign, institution);
    const def = institutionDef(institution);
    if (!inspector || !posture || !def) return [];
    const leaves = inspector.removedTurn ?? (inspector.noticeFiledTurn !== undefined ? inspector.noticeFiledTurn + igRemovalNoticeTurns() : undefined);
    return [
      {
        institution,
        name: def.name,
        posture,
        openMatters: selectMattersFor(campaign, institution).filter(isMatterOpen).length,
        seated: formatDate(selectDateOfTurn(campaign, inspector.seatedTurn)),
        ...(leaves !== undefined ? { leaves: formatDate(selectDateOfTurn(campaign, leaves)) } : {}),
        reasons: inspector.noticeReasons,
      },
    ];
  }).sort((a, b) => b.openMatters - a.openMatters || a.name.localeCompare(b.name));
}

/** The account the board files until a surface collects particulars: the President's sentence, citing the audit it answers when one is running. */
function noticeAccount(campaign: Campaign, institution: InstitutionId, reason: string) {
  const audit = selectMattersFor(campaign, institution).find(isMatterOpen);
  return conclusoryAccount(reason, audit?.id ?? "", campaign.turn);
}

/** What filing notice against one inspector general does, read off the packet the filing commits. */
export type InspectorNoticeTerms = {
  readonly institution: InstitutionId;
  readonly name: string;
  readonly leaves: string;
  /** Congress's mood toward you, 0..1, now and after the filing. */
  readonly dispositionBefore: number;
  readonly dispositionAfter: number;
  /** Audits this filing would make public and mark obstructed. They keep running. */
  readonly obstructs: readonly string[];
};

/** The stated reason does not change the price, so it is read with one supplied; the control asks for the real one. */
export function inspectorNoticeTerms(campaign: Campaign, institution: InstitutionId): InspectorNoticeTerms | { readonly refusal: string } {
  const result = fileInspectorRemovalNotice(campaign, institution, noticeAccount(campaign, institution, "stated"));
  if (!result.ok) return { refusal: result.reason };
  const congress = result.packet.effects.find((effect) => effect.kind === "congress");
  const oversight = result.packet.effects.find((effect) => effect.kind === "oversight");
  return {
    institution,
    name: institutionDef(institution)?.name ?? institution,
    leaves: formatDate(selectDateOfTurn(campaign, campaign.turn + igRemovalNoticeTurns())),
    dispositionBefore: campaign.congress.disposition,
    dispositionAfter: congress?.kind === "congress" && congress.set ? congress.set.disposition : campaign.congress.disposition,
    obstructs: oversight?.kind === "oversight" ? (oversight.matters ?? []).map((matter) => matter.subject) : [],
  };
}

/** The filing itself, with the President's own reasons, built on the campaign it is committed against. */
export function inspectorNoticePacket(campaign: Campaign, institution: InstitutionId, reason: string): EffectPacket {
  const result = fileInspectorRemovalNotice(campaign, institution, noticeAccount(campaign, institution, reason));
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}

export type NoticeOwed = {
  readonly id: FindingId;
  readonly target: string;
  readonly objective: string;
  readonly signed: string;
  readonly daysLate: number;
  readonly reasonsWithheld?: string;
};

/** Covert findings whose notice to the intelligence committees was withheld and is still owed. */
export function noticesOwed(campaign: Campaign): readonly NoticeOwed[] {
  const today = campaignDay(campaign);
  return selectFindings(campaign)
    .filter((finding) => finding.notification === "withheld" && finding.notifiedDay === undefined && finding.closedDay === undefined)
    .map((finding) => ({
      id: finding.id,
      target: selectNation(campaign, finding.target)?.base.identity.name ?? finding.target,
      objective: finding.objective,
      signed: formatDate(finding.signedDate),
      daysLate: today - finding.signedDay,
      ...(finding.reasonsWithheld ? { reasonsWithheld: finding.reasonsWithheld } : {}),
    }));
}

/** Telling the committees, with the statement of reasons the law requires, built on the campaign it is committed against. */
export function committeeNoticePacket(campaign: Campaign, id: FindingId, statement: string): EffectPacket {
  const result = notifyCommittees(campaign, id, statement);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}
