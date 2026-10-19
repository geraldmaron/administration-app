import {
  institutionDef,
  institutionInProse,
  institutionOpening,
  judiciaryBenchSeats,
  judiciarySeatInstitution,
  selectActiveNominations,
  selectBillsOnTheDesk,
  selectOrders,
  type Campaign,
} from "@admin/engine";
import { cabinetSeats } from "../cabinet/seats";
import { chamberControl } from "../government/machine-readings";
import { caucusParty, partyAdjective, partyPlural } from "../congress/party-words";
import { pendingConversations } from "../conversation/scripts";
import { foregroundLedger } from "../record/foreground";
import { PLACES, place, type PlaceKey } from "../navigation/places";
import { roleOfficeHref } from "../shell/office-of";
import { subjectHref } from "../shell/subject";
import { budgetCounsel, economyCounsel, pressCounsel, securityCounsel, worldCounsel } from "./counsel-world";
import type { PlaceCounsel } from "./counsel-shape";

export type { CounselAct, PlaceCounsel } from "./counsel-shape";

// What a place currently counsels, composed from the campaign rather than
// written. One composer answers for a summons clock and for the place that owns
// it, so a clock never says something about its place that the place itself
// does not.
//
// Counsel, not a scoreboard: it says what in the place matters now and leaves
// the headline figures to the place's own header. It is built only from what
// the player has already been shown. Nothing reads a person's attributes, an
// institution's internals, a government the services cannot see into, or the
// odds and effects an act carries before it is taken. Counsel is allowed to be
// thin; it is not allowed to know more than the player does.

/** A place with no standing counsel of its own, said plainly. */
function quietCounsel(key: PlaceKey): PlaceCounsel {
  return { lines: [`${PLACES[key].title} doesn't have a summary.`], quiet: true };
}

function briefCounsel(campaign: Campaign): PlaceCounsel {
  const decisions = pendingConversations(campaign);
  const first = decisions[0];
  if (!first) return { lines: ["Nothing is waiting for your decision."], quiet: true };
  const subject = first.script.subject.replace(/[.\s]+$/, "");
  const lead = decisions.length === 1 ? `A decision is waiting for you: ${subject}.` : `Several decisions are waiting for you. The first is ${subject}.`;
  return { lines: [lead], quiet: false, next: { label: "Open the decision", href: place.decision(first.def.id) } };
}

function executiveCounsel(campaign: Campaign): PlaceCounsel {
  const seats = cabinetSeats(campaign).filter((seat) => !seat.isPlayer);
  const empty = seats.filter((seat) => seat.holder === undefined);
  const firstEmpty = empty[0];
  if (firstEmpty) {
    const title = firstEmpty.office?.chairTitle ?? "Secretary";
    const lead = empty.length === 1 ? `The ${title} seat is empty.` : `Several cabinet seats are empty, including the ${title}.`;
    return { lines: [lead, "A department with no leader can't carry out your plans. Each empty seat also makes the public think you're less able to run the government."], quiet: false, next: { label: `Name a ${title}`, href: roleOfficeHref(firstEmpty.role) } };
  }
  // Ranked on the delivery share the roster already prints under each chair.
  const weakest = seats
    .filter((seat) => seat.deliversFraction !== undefined && seat.office !== undefined)
    .sort((a, b) => (a.deliversFraction ?? 0) - (b.deliversFraction ?? 0) || a.role.localeCompare(b.role))[0];
  const lines = ["Every cabinet seat is filled."];
  if (!weakest?.office) return { lines, quiet: false };
  return {
    lines: [...lines, `${institutionOpening(weakest.office.name)} gets the least done of any department.`],
    quiet: false,
    next: { label: `Review ${institutionInProse(weakest.office.name)}`, href: roleOfficeHref(weakest.role) },
  };
}

function chamberLine(campaign: Campaign, house: boolean, senate: boolean): string {
  const near = partyPlural(caucusParty(campaign, "administration"));
  const other = caucusParty(campaign, "opposition");
  const lead = campaign.congress.administrationParty === "independent" ? `The ${near}, the party closest to you,` : `The ${near}, your party,`;
  if (house && senate) return `${lead} control both the House and the Senate. Most bills still need 60 senators to end debate, so you may need some ${partyAdjective(other)} votes.`;
  const otherPlural = partyPlural(other);
  if (!house && !senate) return `The ${otherPlural} control both the House and the Senate, so nothing passes without some of their votes.`;
  return house
    ? `The ${otherPlural} hold the Senate, so every bill needs some of their votes there.`
    : `The ${otherPlural} hold the House, so every bill needs some of their votes there.`;
}

function congressCounsel(campaign: Campaign): PlaceCounsel {
  const house = chamberControl(campaign, "house").caucus === "administration";
  const senate = chamberControl(campaign, "senate").caucus === "administration";
  const bill = selectBillsOnTheDesk(campaign)[0];
  const lines = [chamberLine(campaign, house, senate)];
  if (bill) {
    lines.push("A bill Congress passed is waiting for you to sign or veto it.");
    return { lines, quiet: false, next: { label: "Sign or veto the bill", href: subjectHref({ kind: "bill", id: bill.id }) } };
  }
  return { lines, quiet: false, next: { label: "Choose a law to propose", href: place.policy() } };
}

function benchOffice(seat: number): string | undefined {
  const institution = judiciarySeatInstitution(seat);
  const office = institution ? institutionDef(institution)?.offices[0] : undefined;
  return office?.id as string | undefined;
}

function courtsCounsel(campaign: Campaign): PlaceCounsel {
  const seats = judiciaryBenchSeats(campaign);
  const empty = seats.find((seat) => seat.vacant);
  const bench = new Set(seats.flatMap((seat) => judiciarySeatInstitution(seat.seat) ?? []).map(String));
  const pending = selectActiveNominations(campaign).some((nomination) => bench.has(nomination.institution as string));
  const challenge = selectOrders(campaign).find((order) => order.review?.status === "pending");
  const lines = [empty ? "A seat on the Supreme Court is empty, and you can nominate someone to fill it." : "Every seat on the Supreme Court is filled. What you control here is which orders you sign, because those are what people take to court."];
  if (pending) lines.push("Your nominee is going through the Senate.");
  else if (challenge) lines.push("One of your orders is being challenged in court.");
  const office = empty && !pending ? benchOffice(empty.seat) : undefined;
  if (office) return { lines, quiet: false, next: { label: "Name a justice", href: subjectHref({ kind: "office", id: office }) } };
  if (challenge) return { lines, quiet: false, next: { label: "Follow the challenge", href: subjectHref({ kind: "case", id: challenge.id }) } };
  return { lines, quiet: false, next: { label: "Review your executive orders", href: place.policy() } };
}

function policyCounsel(campaign: Campaign): PlaceCounsel {
  const bill = selectBillsOnTheDesk(campaign)[0];
  const signed = selectOrders(campaign).some((order) => order.review?.status !== "struck-down");
  const orders = signed ? "Orders you've signed stay in place unless a court strikes them down or a later president reverses them." : "You haven't signed any executive orders yet.";
  if (bill) {
    return { lines: ["A bill is waiting for your signature or veto.", orders], quiet: false, next: { label: "Sign or veto the bill", href: subjectHref({ kind: "bill", id: bill.id }) } };
  }
  return { lines: ["No bill is waiting for your signature.", orders], quiet: false, next: { label: "Choose an executive order", href: place.policy() } };
}

function recordCounsel(campaign: Campaign): PlaceCounsel {
  const ledger = foregroundLedger(campaign);
  if (ledger.length === 0) return { lines: ["Nothing is in the Record yet."], quiet: true, next: { label: "Go to the Brief", href: place.brief() } };
  const own = ledger.filter((entry) => entry.actor === "player");
  const latest = own[own.length - 1];
  const next = { label: "See what you've done", href: place.record() };
  if (!latest) return { lines: ["Nothing you've done is in the Record yet. Everything there so far happened without you."], quiet: false, next };
  return { lines: ["The entries you're responsible for are the things you did yourself.", `Your latest: ${latest.description}`], quiet: false, next };
}

const COUNSEL: Partial<Record<PlaceKey, (campaign: Campaign) => PlaceCounsel>> = {
  brief: briefCounsel,
  washington: executiveCounsel,
  congress: congressCounsel,
  courts: courtsCounsel,
  policy: policyCounsel,
  budget: budgetCounsel,
  economy: economyCounsel,
  world: worldCounsel,
  security: securityCounsel,
  record: recordCounsel,
  pressOffice: pressCounsel,
};

/** What a place currently counsels. A place with none of its own says so rather than inventing one. */
export function placeCounsel(campaign: Campaign, key: PlaceKey): PlaceCounsel {
  const counsel = COUNSEL[key];
  return counsel ? counsel(campaign) : quietCounsel(key);
}
