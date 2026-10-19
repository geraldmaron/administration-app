import { FORCE_PACKAGE_SPECS, } from "./force-packages.js";
const PACKAGE_BRIEFS = {
    "carrier-presence": {
        specId: "carrier-presence",
        purpose: "Show resolve and keep a carrier strike group within reach of a crisis without opening fire.",
        effect: "Signals that the United States can respond quickly from sea, holds air coverage over a theater, and gives allies a visible anchor while diplomats work.",
        componentsProse: "A carrier strike group with its air wing, escorts, and replenishment train — the standard forward-presence package the Navy rotates through contested waters.",
        strategicCost: "The group is drawn from the rotation and cannot simultaneously cover another theater; home-station training and maintenance windows slip while it stays on station.",
        authorityNote: "Presidential deployment authority under existing orders; Congress is notified under war-powers reporting but does not vote before the group sails.",
        riskNote: "A carrier parked within range is a high-value target and an escalation magnet — every sortie and transit is read as a threat by the other side.",
    },
    "surface-blockade": {
        specId: "surface-blockade",
        purpose: "Interdict maritime traffic through a chokepoint or along a hostile coast.",
        effect: "Stops or slows shipping that feeds the adversary's economy or war effort, forces reroutes that raise cost and delay, and gives leverage short of shore bombardment.",
        componentsProse: "Surface action groups with supporting logistics — destroyers and cruisers on patrol boxes, maritime patrol aircraft overhead, and replenishment kept just outside the contested lane.",
        strategicCost: "Hulls committed to a blockade are not available for carrier escort, amphibious ready groups, or another simultaneous crisis; fuel and crew endurance cap how long the line can hold.",
        authorityNote: "Presidential order to employ naval force; a blockade is an act of war, so it starts the War Powers clock and a war with the blockaded government the first time it is laid.",
        riskNote: "Boarding and warning shots can become shooting incidents; neutral shipping misidentified as contraband carriers turns a coercive line into a diplomatic incident.",
    },
    "limited-strike": {
        specId: "limited-strike",
        purpose: "Destroy or degrade a named target set from the air without a ground campaign.",
        effect: "Removes a facility, command node, or capability the adversary relies on, demonstrates reach, and can restore deterrence if the target choice is legible to domestic and allied audiences.",
        componentsProse: "Fighter and strike-fighter packages with tanker and suppression support — the sortie mix a regional air component generates for a time-limited campaign, not a standing occupation.",
        strategicCost: "Sorties come off the Air Force and Navy air wings' monthly allocation; munitions stocks and aircrew readiness drop, and every wing on the strike cannot cover homeland or alliance defense simultaneously.",
        authorityNote: "Presidential direction under Article II for limited action; sustained or expanded strikes move toward war-powers reporting and may require congressional authorization if scope grows.",
        riskNote: "Collateral damage, missed targets, and adversary retaliation — whether against bases, shipping, or cyber — can widen a strike the White House intended to keep bounded.",
    },
    "expeditionary-corps": {
        specId: "expeditionary-corps",
        purpose: "Put ground combat power ashore to seize, hold, or reinforce territory alongside or ahead of allies.",
        effect: "Changes facts on the ground: holds ground the adversary wanted, relieves a besieged partner, or creates a lodgment for follow-on forces and negotiations from strength.",
        componentsProse: "Army or Marine brigade combat teams with their aviation, fires, and sustainment tail — the smallest formation that can fight as a coherent maneuver element rather than a security detachment.",
        strategicCost: "Brigades committed abroad leave the continental rotation thinner; sealift and airlift queue behind the deployment, and every brigade forward is one fewer for homeland response or a second front.",
        authorityNote: "Ground combat into hostile territory requires presidential order; Congress holds the power of the purse and war declaration — sustained corps-level presence crosses from executive action into authorization politics quickly.",
        riskNote: "Ground forces in contact cannot be recalled cleanly; casualties, prisoners, and protracted occupation are the price of choosing this package over air or sea coercion.",
    },
};
const PACKAGE_OBJECTIVES = {
    "carrier-presence": ["reassure", "deter", "protect-shipping", "surveillance"],
    "surface-blockade": ["embargo", "protect-shipping", "deter"],
    "limited-strike": ["strike", "deter", "air-defense"],
    "expeditionary-corps": ["prepare-combat", "defend-partner", "evacuate", "sustain", "strike"],
};
export const ASSISTANCE_PACKAGE_BRIEFS = [
    {
        rung: 1,
        purpose: "Move emergency relief — food, medicine, shelter material — into a government or population under stress.",
        recipients: "Civilian agencies, international organizations, or the host government's disaster ministry when ports and airfields are still open.",
        mechanism: "A purchased and flown shipment credited against reserves, routed through existing aid channels with the US flag on the pallets.",
        costFraming: "A one-time draw on reserves sized to buy and deliver the shipment; no standing commitment beyond the flight and handoff.",
    },
    {
        rung: 2,
        purpose: "Fund a development program — infrastructure, health, or education — that outlasts the news cycle.",
        recipients: "Host ministries and implementing partners with enough capacity to absorb a multi-year grant without immediate diversion.",
        mechanism: "Treasury-backed disbursements tied to program milestones, recorded as aid outflow and growth support on the recipient side.",
        costFraming: "A large reserve outlay relative to a relief flight, priced as capital that stays in the field rather than consumables that disappear in a week.",
    },
    {
        rung: 3,
        purpose: "Stabilize a partner economy under pressure — currency, reserves, or fiscal breathing room when markets are testing the government.",
        recipients: "Central banks, finance ministries, or coalition stabilization desks in a country already in visible difficulty.",
        mechanism: "Balance-of-payments support and policy conditionality bundled as a stabilization package, with dependence on the giver's economy as the honest secondary effect.",
        costFraming: "A major reserve commitment sized to the giver's GDP — the price of standing behind someone else's currency is measured in billions, not millions.",
    },
    {
        rung: 4,
        purpose: "Transfer arms, ammunition, and training so a partner can field capability the giver already holds in stock.",
        recipients: "Trusted allied militaries and ministries of defense with custody chains the giver can audit after delivery.",
        mechanism: "Drawdown from the giver's own readiness stocks plus a standing delivery schedule — spares, training teams, and replenishment spread across months.",
        costFraming: "Aid priced like a defense line item: readiness on the giver drops slightly while a multi-month arms commitment opens on the ledger.",
    },
    {
        rung: 5,
        purpose: "Extend a security guarantee — a public promise that an attack on the partner will be treated as a threat the United States will answer.",
        recipients: "Allied capitals where trust is high enough that the promise is believed and where US reach can plausibly honor it.",
        mechanism: "A flag on the relationship, diplomatic history entry, and readiness bill on the giver — forces promised elsewhere are forces not held at home.",
        costFraming: "The largest assistance rung: aid plus a sustained readiness debit, because a guarantee nobody would fight to keep is worse than silence.",
    },
];
/** Map presidential commitment level to a count inside what composeForcePackages already bounded. */
export function resolvePackageCount(composed, level) {
    const count = level === "limited" ? composed.min : level === "standard" ? composed.defaultCount : composed.max;
    return Math.max(composed.min, Math.min(composed.max, Math.round(count)));
}
export function packageBrief(spec) {
    const brief = PACKAGE_BRIEFS[spec.id];
    if (!brief)
        throw new Error(`no package brief authored for ${spec.id}`);
    return brief;
}
export function objectivesForPackage(specId) {
    const objectives = PACKAGE_OBJECTIVES[specId];
    if (!objectives)
        throw new Error(`no objectives authored for ${specId}`);
    return objectives;
}
/** Every FORCE_PACKAGE_SPECS id must have a brief before ship. */
export function allPackageBriefs() {
    return FORCE_PACKAGE_SPECS.map((spec) => packageBrief(spec));
}
