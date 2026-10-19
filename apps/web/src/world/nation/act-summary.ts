import { STRIKE_OBJECTIVES, type ActAssessment, type ActTerms, type ActWorkspace } from "@admin/player-core";

export type SummaryLine = {
  readonly label: string;
  readonly value: string;
  /** What the value rests on, said under it. */
  readonly basis?: string;
};

type SummaryInput = Pick<ActWorkspace, "name" | "terms"> & { readonly chosen: NonNullable<ActWorkspace["chosen"]>; readonly assessment: ActAssessment };

const rowOf = (assessment: ActAssessment, label: string) => assessment.rows.find((row) => row.label === label)?.act;

function termsWords(terms: ActTerms): string {
  const parts: string[] = [];
  if (terms.tariff) {
    const goods = terms.tariff.sectors.find((entry) => entry.sector === terms.tariff?.sector)?.name ?? terms.tariff.sector;
    parts.push(`${terms.tariff.rate}% on ${goods.toLowerCase()}${terms.tariff.standing > 0 ? `, on top of ${terms.tariff.standing}% already in force` : ""}`);
  }
  if (terms.force && !terms.force.closedReason) parts.push(`sends ${terms.force.countText}`);
  if (terms.strike) {
    const aim = STRIKE_OBJECTIVES.find((objective) => objective.value === terms.strike?.objective)?.label ?? terms.strike.objective;
    parts.push(`aimed at ${aim.toLowerCase()}, with ${terms.strike.protection === "standard" ? "the standard" : "an additional"} civilian-protection assessment`);
  }
  if (terms.support) {
    const asked = terms.support.partners.filter((partner) => partner.chosen).length;
    parts.push(terms.support.mode === "seek" ? `with ${asked} ${asked === 1 ? "partner" : "partners"} asked` : "alone");
  }
  return parts.length > 0 ? parts.join("; ") : "This act takes no terms. Its size is fixed.";
}

function authorityWords(kind: SummaryInput["chosen"]["option"]["ref"]["kind"], assessment: ActAssessment): string {
  switch (kind) {
    case "tariff":
      return "Your order. It takes effect right away.";
    case "authorization":
      return "Both chambers of Congress vote on it.";
    case "treaty": {
      const binds = rowOf(assessment, "The Senate") ?? rowOf(assessment, "Your authority");
      return binds ? `${binds.text}.` : "Your signature, and the Senate where the instrument needs it.";
    }
    case "engagement":
      return "Your decision. The other government decides whether to take it.";
    case "instrument": {
      const consulted = rowOf(assessment, "Who is consulted");
      return consulted ? `Your order, after consulting ${consulted.text}.` : "Your order.";
    }
  }
}

function reversibilityWords(kind: SummaryInput["chosen"]["option"]["ref"]["kind"], assessment: ActAssessment): string {
  switch (kind) {
    case "tariff":
      return "You can lift the measure later from this desk.";
    case "authorization":
      return "Once asked, the vote is Congress's. You cannot withdraw the request.";
    case "treaty":
      return "A signed instrument can be withdrawn later from its own page.";
    case "engagement":
      return "Done at once. The answer goes on your Record.";
    case "instrument": {
      const delayed = rowOf(assessment, "When")?.text.startsWith("First results") ?? false;
      return delayed ? "You can call it off until its first report. The money and forces set aside are released." : "It takes effect at once. Once done, it stays on your Record.";
    }
  }
}

/** What the President should be able to read before authorizing: the target, the terms as set, the cost and what it rests on, who decides, and whether it can be undone. */
export function authorizationSummary({ name, chosen, terms, assessment }: SummaryInput): readonly SummaryLine[] {
  const cost = rowOf(assessment, "Cost now") ?? rowOf(assessment, "Revenue");
  const when = rowOf(assessment, "When");
  const basis = [...(cost?.detail ?? []), ...(when?.detail ?? [])].join(" ");
  const kind = chosen.option.ref.kind;
  return [
    { label: "Target", value: name },
    { label: "Terms", value: termsWords(terms) },
    { label: "Cost", value: cost?.text ?? "Not priced", ...(basis ? { basis } : {}) },
    { label: "Authority", value: authorityWords(kind, assessment) },
    { label: "Can it be undone", value: reversibilityWords(kind, assessment) },
  ];
}
