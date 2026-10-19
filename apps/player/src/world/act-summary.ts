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
    const law = terms.tariff.law;
    parts.push(law.orders === "investigation"
      ? `a ${law.name} investigation of ${law.investigation?.subject === "partner" ? "their trade practices" : `imports of ${goods.toLowerCase()}`}`
      : `${terms.tariff.rate}% on ${goods.toLowerCase()}${terms.tariff.standing > 0 ? `, on top of the ${terms.tariff.standing}% already in place` : ""}, under ${law.name}`);
  }
  if (terms.force && !terms.force.closedReason) parts.push(`sends ${terms.force.countText}`);
  if (terms.strike) {
    const aim = STRIKE_OBJECTIVES.find((objective) => objective.value === terms.strike?.objective)?.label ?? terms.strike.objective;
    parts.push(`aimed at ${aim.toLowerCase()}, with ${terms.strike.protection === "standard" ? "the standard" : "an extra"} check to protect civilians`);
  }
  if (terms.support) {
    const asked = terms.support.partners.filter((partner) => partner.chosen).length;
    parts.push(terms.support.mode === "seek" ? `with ${asked} ${asked === 1 ? "country" : "countries"} asked to join` : "alone");
  }
  return parts.length > 0 ? parts.join("; ") : "There's nothing to set for this one. Its size is fixed.";
}

function authorityWords(kind: SummaryInput["chosen"]["option"]["ref"]["kind"], assessment: ActAssessment, terms: ActTerms): string {
  switch (kind) {
    case "tariff": {
      const law = terms.tariff?.law;
      if (law?.orders === "investigation" && law.investigation) return `${law.investigation.by.charAt(0).toUpperCase()}${law.investigation.by.slice(1)} decides, in about ${law.investigation.weeks} weeks. Then you decide on the tariff.`;
      return law ? `Your order, under ${law.name} (${law.cite}). It takes effect right away.` : "Your order. It takes effect right away.";
    }
    case "authorization":
      return "Both chambers of Congress vote on it.";
    case "treaty": {
      const binds = rowOf(assessment, "The Senate") ?? rowOf(assessment, "Your authority");
      return binds ? `${binds.text}.` : "Your signature, plus the Senate's approval if the agreement needs it.";
    }
    case "engagement":
      return "Your decision. The other country decides whether to accept.";
    case "instrument": {
      const consulted = rowOf(assessment, "Who is consulted");
      return consulted ? `Your order, after consulting ${consulted.text}.` : "Your order.";
    }
  }
}

function reversibilityWords(kind: SummaryInput["chosen"]["option"]["ref"]["kind"], assessment: ActAssessment, terms: ActTerms): string {
  switch (kind) {
    case "tariff":
      return terms.tariff?.law.orders === "investigation" ? "The investigation runs to its finding once ordered. Ordering it doesn't commit you to a tariff." : "You can lift it later from this page.";
    case "authorization":
      return "Once you ask, the vote is up to Congress. You can't take the request back.";
    case "treaty":
      return "You can pull out of a signed agreement later from its own page.";
    case "engagement":
      return "It happens right away, and the answer goes on your Record.";
    case "instrument": {
      const delayed = rowOf(assessment, "When")?.text.startsWith("First results") ?? false;
      return delayed ? "You can call it off until its first report. The money and forces set aside for it come back." : "It takes effect right away and stays on your Record.";
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
    { label: "Country", value: name },
    { label: "What you set", value: termsWords(terms) },
    { label: "Cost", value: cost?.text ?? "No price yet", ...(basis ? { basis } : {}) },
    { label: "Who decides", value: authorityWords(kind, assessment, terms) },
    { label: "Can it be undone", value: reversibilityWords(kind, assessment, terms) },
  ];
}
