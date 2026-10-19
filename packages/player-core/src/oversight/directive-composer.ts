import {
  directableKinds,
  directivesFor,
  INSTITUTION_CATALOG,
  issueDirective,
  type Campaign,
  type DirectiveKind,
  type DirectiveStatus,
  type EffectPacket,
  type InstitutionId,
  type RefusalMemorandum,
} from "@admin/engine";

// The directive composer: which bodies hold a function an instruction could
// be addressed to, what each kind of instruction is, and — before the
// President signs — what the body will do with it. The preview is the packet
// `issueDirective` would commit, read on the same campaign, so a refusal the
// screen shows is the refusal the act writes and a politicization rise it
// quotes is the rise the institution takes.

export const DIRECTIVE_KIND_LABELS: Readonly<Record<DirectiveKind, { readonly label: string; readonly detail: string }>> = {
  investigation: { label: "Direct a case", detail: "Open, close, or change the direction of an investigation into someone you name." },
  targeting: { label: "Aim enforcement at someone", detail: "Tell the agency to use powers it already has against a person or company you name." },
  "enforcement-posture": { label: "Set how strictly it enforces", detail: "How strictly the agency applies the rules it already enforces, for everyone." },
  "sanctions-tempo": { label: "Set the pace of sanctions", detail: "How quickly new people and companies are added to the sanctions list." },
  monetary: { label: "Set the interest rate", detail: "The main interest rate the central bank charges banks to borrow." },
};

export const DIRECTIVE_KIND_ORDER: readonly DirectiveKind[] = ["investigation", "targeting", "enforcement-posture", "sanctions-tempo", "monetary"];

export type DirectiveTarget = {
  readonly institution: InstitutionId;
  readonly name: string;
  readonly kinds: readonly DirectiveKind[];
  /** Instructions this body has already refused; the second refusal at one body opens an inspector general's file. */
  readonly refusals: number;
};

/** Every standing body an instruction could be addressed to, cabinet departments and their bureaus by name. */
export function directiveTargets(campaign: Campaign): readonly DirectiveTarget[] {
  return INSTITUTION_CATALOG.flatMap((def): DirectiveTarget[] => {
    const kinds = directableKinds(def.id);
    if (kinds.length === 0 || !campaign.institutions[def.id]) return [];
    const refusals = directivesFor(campaign, def.id).filter((directive) => directive.status === "refused").length;
    return [{ institution: def.id, name: def.name, kinds: DIRECTIVE_KIND_ORDER.filter((kind) => kinds.includes(kind)), refusals }];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export type DirectivePreview =
  | { readonly ok: false; readonly reason: string }
  | {
      readonly ok: true;
      readonly status: DirectiveStatus;
      /** The statute that bars it, printed unaltered, where it is barred. */
      readonly memorandum?: RefusalMemorandum;
      /** The body's politicization and oversight pressure, 0..1, before and after: a refusal raises both. */
      readonly politicization: { readonly before: number; readonly after: number };
      readonly oversight: { readonly before: number; readonly after: number };
      /** Whether this refusal is the one that makes it a pattern an inspector general opens a file on. */
      readonly opensInquiry: boolean;
      readonly summary: string;
    };

/** A stand-in subject for reading the preview before one is typed; what the body does does not turn on the words. */
const PREVIEW_SUBJECT = "the matter named";

function changesFrom(packet: EffectPacket): { readonly politicization?: number; readonly oversightPressure?: number } {
  for (const effect of packet.effects) {
    if (effect.kind === "institution" && effect.changes) return effect.changes;
  }
  return {};
}

function statusFrom(packet: EffectPacket): DirectiveStatus {
  for (const effect of packet.effects) {
    if (effect.kind === "institution" && effect.directives?.[0]) return effect.directives[0].status;
  }
  return "carried";
}

/** What the body will do with this instruction, read off the packet the issue would commit. */
export function directivePreview(campaign: Campaign, institution: InstitutionId, kind: DirectiveKind, subject: string): DirectivePreview {
  const result = issueDirective(campaign, { institution, kind, subject: subject.trim() || PREVIEW_SUBJECT });
  if (!result.ok) return { ok: false, reason: result.reason };
  const runtime = campaign.institutions[institution]!;
  const changes = changesFrom(result.packet);
  const status = statusFrom(result.packet);
  const directive = result.packet.effects.flatMap((effect) => (effect.kind === "institution" ? (effect.directives ?? []) : []))[0];
  return {
    ok: true,
    status,
    ...(directive?.memorandum ? { memorandum: directive.memorandum } : {}),
    politicization: { before: runtime.politicization, after: changes.politicization ?? runtime.politicization },
    oversight: { before: runtime.oversightPressure, after: changes.oversightPressure ?? runtime.oversightPressure },
    opensInquiry: result.packet.effects.some((effect) => effect.kind === "oversight"),
    summary: result.packet.narration.summary,
  };
}

/** The instruction itself, built on the campaign it is committed against. */
export function directivePacket(campaign: Campaign, institution: InstitutionId, kind: DirectiveKind, subject: string): EffectPacket {
  const result = issueDirective(campaign, { institution, kind, subject });
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}
