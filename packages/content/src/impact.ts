import { CohortId } from "@admin/world";
import { z } from "zod";

// What a decision did to people and to money, as the author understands it —
// never as the number the engine will apply.
//
// Before this, a reply authored `{ treasury: -30, stability: -0.07 }` directly.
// Three things were wrong with that and only the third is obvious.
//
// The first is scale. The dataset carries real GDP in USD millions and real
// population, and a relief operation that is a rounding error for one economy
// is a supplemental for another. A fixed figure is correct for exactly one
// country, in a game that is about to be aimed at fifty.
//
// The second is that a rebalance meant editing every scenario that touched the
// economy. At three hundred that is painful; at two thousand it does not happen,
// which means the balance that shipped is the balance that stays.
//
// The third is that nothing connected the prose to the price. A scenario saying
// "nineteen dead" and one saying "two provinces gone" could charge the same
// stability, and no gate could catch it because there was nothing to compare
// the sentence against. A band is a claim about the world, so an audit can read
// the beats and refuse a scenario whose declared cost contradicts what it says
// out loud.
//
// Bands are resolved into effects by `impact-model.ts`, which is versioned on
// its own. That separation is the whole point: adding a country needs no
// scenario edits, and a rebalance is one file and a version bump.

/**
 * Lives, as a share of the affected population rather than as a count.
 *
 * A count would have to be authored against a country the scenario does not
 * know it will be cast onto — the same reason a scenario names a kind of place
 * and not a city. Four hundred dead is a different week in a country of four
 * million than in one of four hundred million, and these bands are what lets
 * one piece of writing be correct in both.
 */
export const HumanToll = z.enum(["none", "isolated", "dozens", "hundreds", "thousands", "mass"]);
export type HumanToll = z.infer<typeof HumanToll>;

export const DisplacementScale = z.enum(["none", "local", "regional", "national"]);
export type DisplacementScale = z.infer<typeof DisplacementScale>;

/**
 * Who bore it.
 *
 * The field that makes a body count political rather than arithmetic. The same
 * toll lands differently on the whole country, on one region, on a group the
 * government is already accused of neglecting, on the services who were sent,
 * or on foreigners — and only the last of those is mostly a question of
 * standing rather than of approval at home.
 */
export const TollBorneBy = z.enum(["diffuse", "one-region", "one-group", "the-services", "abroad"]);
export type TollBorneBy = z.infer<typeof TollBorneBy>;

/**
 * Money, as what it takes to authorize rather than as a sum.
 *
 * "Discretionary" is inside what an executive can move alone; "supplemental"
 * has to be asked for; "emergency" is asked for under a clock and granted
 * against the government's own future room; "structural" is a permanent claim
 * on the budget. The distinction the player feels is which of those four
 * conversations they have just started, not the figure.
 */
export const FinancialScale = z.enum(["none", "discretionary", "supplemental", "emergency", "structural"]);
export type FinancialScale = z.infer<typeof FinancialScale>;

export const FinancialHorizon = z.enum(["one-off", "multi-year", "permanent"]);
export type FinancialHorizon = z.infer<typeof FinancialHorizon>;

/**
 * What the decision spent that is not money and not lives.
 *
 * Capacity to act, in kind. These are the costs a government feels most and
 * accounts for least: a source burned is an intelligence service that knows
 * less next year, alliance credit spent is a favor that cannot be asked twice,
 * legislative capital spent is the bill that now will not pass.
 */
export const InstitutionalCost = z.enum([
  "forces-committed",
  "intelligence-source-burned",
  "legal-authority-spent",
  "alliance-credit-spent",
  "alliance-credit-earned",
  "legislative-capital-spent",
  "civil-service-strained",
  "emergency-powers-invoked",
  // The government's own conduct is what is now in question — an inspector
  // general, a referral, a hearing about the act itself rather than about its
  // result. The eight above are all things an administration spent; this is the
  // one thing an act can cost that it never had, and a scandal that arrived out
  // of a decision had no way to say so.
  "conduct-in-question",
]);
export type InstitutionalCost = z.infer<typeof InstitutionalCost>;

/**
 * How visibly this was the government's own doing.
 *
 * The multiplier on every reputational consequence below, and the reason
 * collateral damage is a different event from a flood with the same toll. A
 * public forgives a government for what happened to it and does not forgive it
 * for what it did — and "inherited" is the third case that every administration
 * spends its first year arguing about.
 */
export const ImpactAgency = z.enum(["our-doing", "on-our-watch", "inherited", "acted-upon"]);
export type ImpactAgency = z.infer<typeof ImpactAgency>;

export const ScenarioImpact = z
  .object({
    human: z
      .object({
        lives: HumanToll.optional(),
        accounting: z.enum(["new", "already-reported"]).optional(),
        displaced: DisplacementScale.optional(),
        borneBy: TollBorneBy.optional(),
        /**
         * Which cohorts the toll (or the act) actually fell on. Answers
         * `one-group` not being able to say which group. One to three: a toll
         * that fell on four of the sixteen fell on the country. Optional in
         * the schema; required by audit whenever borneBy is one-group.
         */
        cohorts: z.array(CohortId).min(1).max(3).optional(),
      })
      .strict()
      .optional(),
    financial: z
      .object({
        scale: FinancialScale.optional(),
        /** Local damage is priced against the bound city, not the entire national economy. */
        scope: z.enum(["national", "city"]).optional(),
        horizon: FinancialHorizon.optional(),
        /**
         * The reply's own arithmetic, when the fiction states it: four hundred
         * drivers at an hourly rate for twenty-six weeks. Priced as quantity
         * times unit cost times weeks instead of from the band's anchor, in the
         * world's dollars for the United States. The band still says how the
         * money is authorized; `source` says where the unit cost came from, or
         * that it is a planning value.
         */
        basis: z
          .object({
            quantity: z.number().positive(),
            unit: z.string().trim().min(2).max(40),
            unitCostUSD: z.number().positive(),
            weeks: z.number().int().min(1).max(520).optional(),
            source: z.string().trim().min(12).max(300),
            coverage: z.string().trim().min(30).max(600).optional(),
            components: z.array(z.object({ label: z.string().trim().min(3).max(80), quantity: z.number().positive(),
              unit: z.string().trim().min(2).max(40), unitCostUSD: z.number().positive(),
              weeks: z.number().int().min(1).max(520).optional(), source: z.string().trim().min(12).max(300),
            }).strict()).min(1).max(12).optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    institutional: z.array(InstitutionalCost).min(1).max(3).optional(),
    /**
     * Required whenever a human toll is declared. A toll with no agency is the
     * one shape the model cannot price, because whether a government is blamed
     * for a death is not a smaller question than how many died — it is the
     * larger one.
     */
    agency: ImpactAgency.optional(),
    /**
     * Whether the decision split the country. Optional and one-directional:
     * a decision may divide a public and none may declare it united, which is
     * why there is no negative here and unity is bought back through the
     * ordinary opinion drivers instead.
     */
    divisive: z.boolean().optional(),
  })
  .strict()
  .superRefine((impact, ctx) => {
    const toll = impact.human?.lives;
    if (toll && toll !== "none" && impact.agency === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agency"],
        message:
          `an impact declaring a human toll ("${toll}") must also declare agency: whether the government did this, ` +
          "presided over it, inherited it, or had it done to them is what decides the whole reputational price, and " +
          "the model will not guess it",
      });
    }
  });
export type ScenarioImpact = z.infer<typeof ScenarioImpact>;
