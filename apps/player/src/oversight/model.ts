import type { Campaign, DirectiveKind } from "@admin/engine";
import { inquiryPipeline, type DirectiveTarget } from "@admin/player-core";

/** The statutes and clauses the oversight screens cite (DECISIONS §8.12). */
export const LAW = {
  inspectors: "5 U.S.C. §§401–424",
  covertNotice: "50 U.S.C. §3093",
  takeCare: "U.S. Const. art. II, §3",
  appointments: "U.S. Const. art. II, §2, cl. 2",
  vacancies: "5 U.S.C. §§3345–3349d",
  executivePower: "U.S. Const. art. II, §1",
} as const;

export const OVERSIGHT_VIEWS = ["inquiries", "directives", "inspectors", "appointments"] as const;
export type OversightView = (typeof OVERSIGHT_VIEWS)[number];

export function oversightView(value: unknown): OversightView {
  return OVERSIGHT_VIEWS.find((entry) => entry === value) ?? "inquiries";
}

type DirectiveSubject = { readonly value: string; readonly label: string };

/** Text is the instruction recorded by the existing executor, never a promise of an unmodeled policy-rate or enforcement effect. */
const INSTRUCTIONS: Readonly<Partial<Record<DirectiveKind, readonly string[]>>> = {
  "enforcement-posture": ["Maintain the current enforcement posture", "Prioritize enforcement of existing statutory responsibilities", "Review the current enforcement posture"],
  "sanctions-tempo": ["Maintain the current pace of sanctions designations", "Request an accelerated review of sanctions designations", "Request a review of the current designation pace"],
  monetary: ["Request a lower policy rate", "Request the current policy rate be maintained", "Request a higher policy rate"],
};

/** The subjects an instruction may name: a predefined request, or a matter already recorded at that body; inventing a case is not offered. */
export function directiveSubjects(campaign: Campaign, target: DirectiveTarget, kind: DirectiveKind): readonly DirectiveSubject[] {
  const requests = INSTRUCTIONS[kind];
  if (requests) return requests.map((label) => ({ value: label, label }));
  const matters = inquiryPipeline(campaign).stages.flatMap((stage) => stage.matters).filter((matter) => matter.institution === target.institution);
  const seen = new Set<string>();
  return matters.flatMap((matter) => {
    if (seen.has(matter.subject)) return [];
    seen.add(matter.subject);
    return [{ value: matter.subject, label: matter.subject }];
  });
}

export const percent = (value: number): string => `${Math.round(value * 100)}%`;

/** A 0..1 reading the act moves, said as before and after. */
export function movedWords(before: number, after: number): string {
  return Math.abs(after - before) > 0.0005 ? `${percent(before)} to ${percent(after)}` : percent(after);
}
