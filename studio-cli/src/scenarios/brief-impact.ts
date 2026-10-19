import { DisplacementScale, FinancialHorizon, FinancialScale, HumanToll, ImpactAgency, InstitutionalCost, TollBorneBy } from "@admin/content";

export function impactSection(): string {
  return `IMPACT — what the decision did to people and to money. Declare it; do not price it.

For a priced program, state quantity × unit cost × duration in financial.basis and cite the source.
Add separately sourced components where the federal cost has several parts; coverage must say what
is included/excluded and why. A placement grant alone is not the complete federal cost. Unknown
inputs are explicit planning assumptions, never silently missing cost components. Band-only prices
remain broad proxies. The card shows an estimate; the Record books a separate actual and variance.

A "position" reply carries two different costings and they do not overlap:
  - "cost" is what the ACT spent: treasury/stability/militaryReadiness/standing, authored as numbers. This is a
    fact about the government — the standing burned by saying this out loud, the stability of having
    done it. Gate rule 2 still applies to it.
  - "impact" is what the decision did to PEOPLE and to the BUDGET, declared in bands and never as
    arbitrary metric figures. Use sourced arithmetic in financial.basis wherever the premise prices quantities. The game resolves bands against the bearing country, so one piece of
    writing is correct in a country of four million and one of four hundred million. A hand-typed
    treasury figure is right for exactly one nation; a band is right for all of them.

Declare an impact on any reply whose fiction has a body count, displaced people, money that had to be
authorized, or a capability spent. A reply whose beats say people died and that declares no impact is
a scenario where nobody died — the prose is decoration and the gate will refuse it.

  "impact": {
    "human": { "lives": ${HumanToll.options.join(" | ")},
               "displaced": ${DisplacementScale.options.join(" | ")},
               "borneBy": ${TollBorneBy.options.join(" | ")} },
    "financial": { "scale": ${FinancialScale.options.join(" | ")},
                   "horizon": ${FinancialHorizon.options.join(" | ")} },
    "institutional": [${InstitutionalCost.options.map((cost) => `"${cost}"`).join(", ")}],  // one to three
    "agency": ${ImpactAgency.options.join(" | ")},
    "divisive": true | false
  }

Every field is optional, but five rules bind:
  - "lives" counts the dead and "displaced" counts people who lost their homes. Nothing else. If the
    prose has illness, arrest, a closure, a queue or economic ruin — and no bodies and no lost homes —
    the "human" block does not appear at all. Two patients coming back by ambulance is not a toll, a
    sealed neighborhood displaces nobody (a cordon holds people in the homes they already have), and
    vendors locked out of their stock have lost money rather than a house. These are real costs and
    the vocabulary here cannot say them; declare the financial and institutional halves, and let the
    prose carry the rest. An empty-looking block is not a reason to reach for a human band — a band
    the prose does not support is priced as three dead who never existed.
  - "lives" must match what the beats actually say. The bands mean counts, not shares: "isolated" is a
    handful, "dozens" is tens, "hundreds" is hundreds, "thousands" is thousands, "mass" is a
    catastrophe. Writing "nineteen dead" and declaring "hundreds" is refused, and so is the reverse.
  - Any toll above "none" MUST declare "agency". Whether a government did this, presided over it,
    inherited it, or had it done to it decides the entire reputational price, and nothing will guess it.
    "acted-upon" moves the public the other way: a country attacked from outside closes ranks.
  - "borneBy": "abroad" means the dead were not the player's own citizens. Use it for a strike or an
    operation on foreign ground, and only then — it is the difference between killing your own people
    and someone else's.
  - "financial" is the conversation the money starts, not the sum: "discretionary" is inside what an
    executive moves alone, "supplemental" has to be asked for, "emergency" is asked for under a clock,
    "structural" is a permanent claim on the budget.

Do not declare stability or standing inside an impact — those belong on "cost", and declaring them in
both bills the same decision twice.`;
}
