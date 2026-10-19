import type { GoverningStyle } from "@admin/engine";

export const GOVERNING_STYLE_WORDS: Readonly<Record<GoverningStyle, { readonly label: string; readonly detail: string }>> = {
  pragmatic: { label: "Deal maker", detail: "You look for deals both sides can live with. This shapes how well you get along with people. A deal can mean giving up part of what you wanted." },
  principled: { label: "Sticks to principles", detail: "You hold firm when you negotiate. People who share your beliefs warm to you, but it's harder to meet in the middle with people who don't." },
  cautious: { label: "Careful", detail: "You take small, careful steps. People who size you up see you as less bold. Waiting too long can mean missing a chance." },
  hawkish: { label: "Ready to use force", detail: "You put more weight on showing strength and applying pressure. This shapes how quick you are to use force and how well you get along with people. The choice to use force is always still yours." },
  dovish: { label: "Diplomacy first", detail: "You'd rather settle things by talking. This shapes how quick you are to use force and how well you get along with people. Holding back can leave a threat in place." },
};

/**
 * How a question is answered. Every format scores to one number from -1 to
 * +1, so the profile reads them all alike:
 * - choice: one of the three, scored -1, 0 or +1.
 * - scale: a place on a seven-step line between the first and the third.
 * - split: ten shares of effort divided between the first and the third.
 * - rank: the three put in order; what comes first and what comes last say
 *   which way, so ranking the middle one first still leans.
 */
export type QuestionFormat = "choice" | "scale" | "split" | "rank";

export type LeadershipQuestion = {
  readonly id: string;
  readonly area: string;
  readonly prompt: string;
  /** In scoring order: -1, 0, +1. The center answer is a substantive trade-off, not a skipped answer. */
  readonly options: readonly [string, string, string];
  readonly format: QuestionFormat;
};

export const SCALE_STOPS = 7;
export const SPLIT_SHARES = 10;

const MIDDLE_STOP = (SCALE_STOPS - 1) / 2;

/** A place on the scale, 0 at the first end, as a score. */
export function scaleScore(stop: number): number {
  return (stop - MIDDLE_STOP) / MIDDLE_STOP;
}

/** The scale stop a score sits at. */
export function scaleStop(score: number): number {
  return Math.round(score * MIDDLE_STOP + MIDDLE_STOP);
}

/** Shares given to the first side out of ten, as a score: all ten to the first is -1. */
export function splitScore(firstShares: number): number {
  return (SPLIT_SHARES - 2 * firstShares) / SPLIT_SHARES;
}

/** The shares the first side holds under a score. */
export function splitShares(score: number): number {
  return Math.round(((1 - score) * SPLIT_SHARES) / 2);
}

/** An order of the three options, most wanted first, as a score: the first's lean against the last's. */
export function rankScore(order: readonly number[]): number {
  if (order.length !== 3 || new Set(order).size !== 3 || order.some((at) => at < 0 || at > 2)) throw new Error("A ranking puts all three options in order.");
  return (order[0]! - 1 - (order[2]! - 1)) / 2;
}

/** Where each area's questions are drawn from, for the glyph a question carries. */
export const QUESTION_AREA_GLYPH: Readonly<Record<string, string>> = {
  "Economic policy": "economyGrowth",
  "Rights and the law": "law",
  "International role": "world",
  "Use of force": "instrumentMilitary",
  "Working with others": "summit",
};

/** Version 1 order is a saved-data contract: four questions per scored dimension. */
export const LEADERSHIP_QUESTIONS: readonly LeadershipQuestion[] = [
  { id: "recession", area: "Economic policy", prompt: "A recession is costing people their jobs, and borrowing is getting more expensive for the government. What do you do first?", options: ["Spend more on public projects, even if the government borrows more.", "Send short-term help to the families hit hardest, even though it reaches fewer people.", "Cut business taxes and red tape, even though people get less direct help."], format: "split" },
  { id: "healthcare", area: "Economic policy", prompt: "Medical bills keep going up. Where should the next round of money go?", options: ["Cover more people with government insurance, paid for with higher taxes.", "Help people with low incomes buy coverage, and keep today's mix of public and private plans.", "Give people more insurance choices and make insurers compete, even if some end up with less coverage."], format: "split" },
  { id: "labor", area: "Economic policy", prompt: "Workers want more power to bargain over pay, and employers warn it will raise their costs. What do you back?", options: ["Give unions more bargaining power, even if it costs employers more.", "Set basic protections for everyone and leave most bargaining to each workplace.", "Keep things flexible for employers, even if workers have less bargaining power."], format: "scale" },
  { id: "competition", area: "Economic policy", prompt: "A few big companies control a market people can't do without. What should the government do?", options: ["Break the companies up, even if things are bumpy while it happens.", "Let the big companies stay, but make them share access and follow fair rules.", "Make it easier for new companies to compete, even if the big ones stay on top."], format: "rank" },
  { id: "surveillance", area: "Rights and the law", prompt: "After a believable threat, intelligence officials want more power to watch communications. What do you ask for?", options: ["Only watch people a judge approves one by one, even if it's slower.", "More power for a limited time, checked by a court and ending on a set date.", "Broad power to watch for threats before they happen, checked by your own officials, even at a cost to privacy."], format: "scale" },
  { id: "protest", area: "Rights and the law", prompt: "Protesters are blocking a major federal building. What do you tell officials to do?", options: ["Protect the right to protest and work out a way in, even if the disruption goes on.", "Keep a narrow path into the building open while still protecting the protest.", "Clear the blockade quickly within the law, even if it leads to clashes."], format: "choice" },
  { id: "emergency", area: "Rights and the law", prompt: "An emergency power is working, but the deadline set by law is coming up. What do you do?", options: ["Go back to normal powers, even if things move more slowly.", "Ask Congress for a short, limited extension, with regular reports to them.", "Seek the widest extension the law allows, even if it gives you more control than usual."], format: "scale" },
  { id: "oversight", area: "Rights and the law", prompt: "Congress wants sensitive records from your administration for an investigation. How do you respond?", options: ["Hand over as much as the law allows, even if it causes you political and practical trouble.", "Work out a deal to share them safely, blacking out only what you can justify.", "Claim executive privilege (a President's right to keep some advice private) where it applies, and let the courts decide."], format: "rank" },
  { id: "trade", area: "International role", prompt: "A trade deal would lower prices but put one American industry up against more foreign competition. Where do you stand?", options: ["Join the deal and pay to help affected workers adjust, even if it shakes up the industry.", "Phase the deal in slowly, with protections that can be enforced.", "Protect the American industry, even if prices rise and other countries strike back."], format: "choice" },
  { id: "climate", area: "International role", prompt: "A climate agreement with other countries would limit what you can do at home. What do you offer?", options: ["A firm promise, checked by other countries.", "A promise that gets stronger as other countries keep theirs.", "Goals you set for yourself, without other countries checking."], format: "scale" },
  { id: "refugees", area: "International role", prompt: "A partner country asks for help with people forced from their homes by war. Where do you put your effort?", options: ["Take in more refugees legally and help them settle into life here.", "Take in a few more refugees and also send help to the region.", "Send aid near the fighting and keep the number coming here the same."], format: "split" },
  { id: "institutions", area: "International role", prompt: "An international organization turns down a proposal you care about. What's your next step?", options: ["Keep negotiating inside the organization, even if it takes longer.", "Build a group of willing countries while the wider talks go on.", "Go your own way within the law, even if fewer countries back you."], format: "rank" },
  { id: "provocation", area: "Use of force", prompt: "A rival country keeps harassing ships from allied countries but hasn't fired a shot. What do you prefer?", options: ["Talk and keep watch, even if the harassment goes on.", "Send ships as escorts and give a private warning, even though sending them costs money.", "Make a visible show of military strength within your current powers, even if it risks making things worse."], format: "scale" },
  { id: "hostages", area: "Use of force", prompt: "Americans are being held captive abroad. A rescue might work, but the information is incomplete. What comes first?", options: ["Keep negotiating through go-betweens, even if they're held longer.", "Gather more information while preparing both talks and a rescue.", "Get ready to order a rescue as soon as the legal and military checks are met."], format: "choice" },
  { id: "ally", area: "Use of force", prompt: "An ally faces a growing threat and asks for more American troops. What do you offer?", options: ["Diplomatic pressure and non-military help first.", "A small force for defense only, tied to a plan you make together.", "A larger force close to the threat, even with the cost and risk."], format: "split" },
  { id: "ceasefire", area: "Use of force", prompt: "A costly war has a shaky chance at a ceasefire. What matters most to you?", options: ["Stop the fighting now with monitors, even if some goals aren't met.", "Pause step by step, tied to actions that can be checked.", "Keep up the pressure until you get better terms, even as the losses go on."], format: "rank" },
  { id: "coalition", area: "Working with others", prompt: "Congress will pass half of your biggest plan if you drop a key part. What do you do?", options: ["Keep the key part and ask voters for more support, even if no bill passes.", "Agree to try the key part for a while, with a review on a set date.", "Take the half bill now and come back for the rest later."], format: "choice" },
  { id: "cabinet", area: "Working with others", prompt: "A capable Cabinet member openly disagrees with your policy. How do you respond?", options: ["Insist they fully back the policy, even if they might quit.", "Hear them out in private and set a date to decide.", "Work out a compromise on how to carry it out, even if your message is less united."], format: "rank" },
  { id: "evidence", area: "Working with others", prompt: "Early evidence suggests a campaign promise may not work. What do you tell the country?", options: ["Keep the goal but change how you get there, even if it takes longer.", "Pause the part in question while independent experts review it.", "Change the promise in the open, even though backing down costs you politically."], format: "choice" },
  { id: "negotiation", area: "Working with others", prompt: "A partner offers a useful deal, but some of its terms go against what you've said in public. What do you do?", options: ["Stick to what you said, even if you lose the deal.", "Look for a smaller deal that leaves out the terms in dispute.", "Accept a fair compromise and explain what you gave up."], format: "scale" },
];
