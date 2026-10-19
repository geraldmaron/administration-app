import { TARIFF_STATUTES, compareDates, daysBetween, selectDateOfTurn, suppliersOf, tradeSector, type Campaign, type TariffFinding } from "@admin/engine";
import type { NationId } from "@admin/world";
import { formatDate } from "../format/figures";
import { anchored, place } from "../navigation/places";
import type { AttentionItem } from "./attention-row";

// What trade has the President waiting: an investigation that has not ruled,
// a partner's answer to a tariff that has not landed, and a Section 122 order
// running out its 150 days. Ambient rows, never stops: the week a finding is
// made, the advance itself stops once to say so, and a row that went on
// stopping the week would hold Continue on news nothing can answer.

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const nationName = (campaign: Campaign, id: NationId): string => campaign.nations[id]?.base.identity.name ?? id;

/** Where an investigation is read: the country's act page when it names one country, the trade view when it is about goods from everyone. */
function findingHref(finding: TariffFinding): string {
  return finding.partner ? anchored(place.countryAct(finding.partner), "act-situation") : anchored(place.economyView("trade"), "pending");
}

/** Every page an investigation belongs on: the country it names, or every country that sells the goods. */
function findingAbout(campaign: Campaign, finding: TariffFinding): readonly string[] {
  if (finding.partner) return [`nation:${finding.partner}`];
  return [`sector:${finding.sector}`, ...suppliersOf(campaign, finding.sector!).map((edge) => `nation:${edge.partner}`)];
}

/** What an investigation is about, in a few words: "steel" or "China's trade practices". */
export function findingSubjectWords(campaign: Campaign, finding: TariffFinding): string {
  if (finding.partner) return `${nationName(campaign, finding.partner)}'s trade practices`;
  return (tradeSector(finding.sector!)?.name ?? finding.sector!).toLowerCase();
}

export function investigationItems(campaign: Campaign): readonly AttentionItem[] {
  return Object.values(campaign.trade.findings ?? {})
    .filter((finding) => !finding.outcome)
    .map((finding): AttentionItem => {
      const law = TARIFF_STATUTES[finding.statute];
      const by = law.investigation?.by ?? "The agency";
      const days = daysBetween(campaign.calendar, finding.dueDate);
      return {
        id: finding.id,
        source: "investigation",
        urgency: "ambient",
        subject: finding.id,
        title: `${law.name} investigation: ${findingSubjectWords(campaign, finding)}`,
        reason: days <= 0 ? `${capitalize(by)}'s finding is due. Press Continue to hear it.` : `${capitalize(by)} rules ${formatDate(finding.dueDate)}. Until then you can't use this law.`,
        href: findingHref(finding),
        stance: "neutral",
        figure: days <= 0 ? "due" : `${days}d`,
        icon: "law",
        dueDate: finding.dueDate,
        opened: finding.openedDate,
        waitingOn: capitalize(by),
        about: findingAbout(campaign, finding),
      };
    });
}

/** How long a ruling stays on the Desk as news after it is made. */
const RULING_NEWS_DAYS = 7;

/**
 * A finding made in the last week, as news: what it found and what it opens.
 * It is the row the week's stop opens, and it is ambient because the stop
 * itself already happened.
 */
export function rulingItems(campaign: Campaign): readonly AttentionItem[] {
  return Object.values(campaign.trade.findings ?? {})
    .filter((finding) => finding.outcome && finding.decidedDate && daysBetween(finding.decidedDate, campaign.calendar) <= RULING_NEWS_DAYS)
    .map((finding): AttentionItem => {
      const law = TARIFF_STATUTES[finding.statute];
      const by = capitalize(law.investigation?.by ?? "The agency");
      const found = finding.outcome === "affirmative";
      return {
        id: finding.id,
        source: "investigation",
        urgency: "ambient",
        subject: finding.id,
        title: `${law.name} finding: ${findingSubjectWords(campaign, finding)}`,
        reason: found ? `${by} made the finding on ${formatDate(finding.decidedDate!)}. You can now use ${law.name}.` : `${by} found no case on ${formatDate(finding.decidedDate!)}. You can order a new investigation.`,
        href: findingHref(finding),
        stance: found ? "favorable" : "caution",
        icon: "law",
        about: findingAbout(campaign, finding),
      };
    });
}

export function retaliationItems(campaign: Campaign): readonly AttentionItem[] {
  return campaign.trade.retaliation
    .filter((record) => !record.landed)
    .flatMap((record): readonly AttentionItem[] => {
      const answering = campaign.trade.measures[record.answering];
      const dueDate = selectDateOfTurn(campaign, record.dueTurn);
      const name = nationName(campaign, record.by);
      const goods = (tradeSector(record.sector)?.name ?? record.sector).toLowerCase();
      return [
        {
          id: `retaliation:${record.id}`,
          source: "consequence-return",
          urgency: "ambient",
          subject: `retaliation:${record.id}`,
          title: `${name} is expected to answer your tariff`,
          reason: `Its answer, likely on ${goods}, is expected ${formatDate(dueDate)}.`,
          href: anchored(place.countryAct(record.by), "act-situation"),
          stance: "caution",
          icon: "subjectTrade",
          dueDate,
          ...(answering ? { opened: answering.imposedDate } : {}),
          waitingOn: name,
          about: [`nation:${record.by}`],
        },
      ];
    });
}

export function tariffExpiryItems(campaign: Campaign): readonly AttentionItem[] {
  return Object.values(campaign.trade.measures)
    .filter((measure) => measure.origin === "us" && measure.liftedTurn === undefined && measure.expiresDate !== undefined && compareDates(measure.expiresDate, campaign.calendar) >= 0)
    .map((measure): AttentionItem => {
      const law = measure.statute ? TARIFF_STATUTES[measure.statute] : undefined;
      const goods = (tradeSector(measure.sector)?.name ?? measure.sector).toLowerCase();
      const name = nationName(campaign, measure.target);
      return {
        id: `expiry:${measure.id}`,
        source: "standing-threshold",
        urgency: "ambient",
        subject: `expiry:${measure.id}`,
        title: `Tariff on ${name}'s ${goods} runs out`,
        reason: `${law ? `${law.name} orders` : "This order"} ${law?.clockDays ? `last ${law.clockDays} days` : "run out"}. It lapses ${formatDate(measure.expiresDate!)} unless Congress extends it.`,
        href: anchored(place.countryAct(measure.target), "act-situation"),
        stance: "neutral",
        icon: "subjectTrade",
        dueDate: measure.expiresDate!,
        opened: measure.imposedDate,
        about: [`nation:${measure.target}`],
      };
    });
}
