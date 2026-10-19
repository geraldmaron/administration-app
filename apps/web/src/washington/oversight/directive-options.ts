import type { Campaign, DirectiveKind } from "@admin/engine";
import { inquiryPipeline, type DirectiveTarget } from "@admin/player-core";

type DirectiveSubject = { readonly value: string; readonly label: string };

/** Text is the instruction recorded by the existing executor, never a promise of an unmodeled policy-rate or enforcement effect. */
const INSTRUCTIONS: Readonly<Partial<Record<DirectiveKind, readonly string[]>>> = {
  "enforcement-posture": ["Maintain the current enforcement posture", "Prioritize enforcement of existing statutory responsibilities", "Review the current enforcement posture"],
  "sanctions-tempo": ["Maintain the current pace of sanctions designations", "Request an accelerated review of sanctions designations", "Request a review of the current designation pace"],
  monetary: ["Request a lower policy rate", "Request the current policy rate be maintained", "Request a higher policy rate"],
};

export function directiveSubjects(campaign: Campaign, target: DirectiveTarget, kind: DirectiveKind): readonly DirectiveSubject[] {
  const requests = INSTRUCTIONS[kind];
  if (requests) return requests.map((label) => ({ value: label, label }));
  const pipeline = inquiryPipeline(campaign);
  const matters = pipeline.stages.flatMap((stage) => stage.matters)
    .filter((matter) => matter.institution === target.institution);
  const seen = new Set<string>();
  return matters.flatMap((matter) => {
    if (seen.has(matter.subject)) return [];
    seen.add(matter.subject);
    return [{ value: matter.subject, label: matter.subject }];
  });
}
