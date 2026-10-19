// A partner answering a US tariff in kind: the President puts a tariff on a
// Saudi export sector, the chance of an answer is drawn the week it is signed,
// and the trade week lands the answer on the schedule it was given. The wire
// files it naming the country as its subject and no one else, which is the
// shape the composer has to read as a country and not as a person.
//
// Retaliation is a draw, so the fixture walks the Saudi sectors the United
// States tariffs, in a fixed order, until one draws an answer; the same build
// always lands on the same sector.
import { apply } from "../../packages/engine/dist/effects.js";
import { selectExpectedRetaliation } from "../../packages/engine/dist/trade.js";
import { imposeSection301Tariff } from "./_tariff.mjs";
import { TRADE_SECTORS } from "../../packages/engine/dist/trade-sectors.js";
import { composeArticle } from "../../packages/engine/dist/article.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "trade-retaliation";

const PARTNER = "SAU";
const RATE = 0.25;
const LAG_WEEKS = 4;

function tariffThatDrawsAnAnswer(campaign) {
  for (const sector of TRADE_SECTORS.filter((def) => def.instrument === "tariff")) {
    const result = imposeSection301Tariff(campaign, PARTNER, sector.id, RATE);
    if (!result.ok) continue;
    const signed = apply(result.campaign, result.packet);
    if (selectExpectedRetaliation(signed).some((record) => record.by === PARTNER)) return signed;
  }
  throw new Error(`no ${PARTNER} sector draws a retaliation at ${RATE * 100}%`);
}

export function build() {
  const opening = foundFixture({ seedText: "fixture-trade-retaliation", leaderName: "Fixture President" });
  const campaign = advanceWeeks(tariffThatDrawsAnAnswer(opening), LAG_WEEKS + 1);
  const index = campaign.feed.findIndex((item) => /^Saudi Arabia retaliates against American /.test(item.headline));
  if (index < 0) throw new Error("the retaliation never reached the wire");
  const item = campaign.feed[index];
  const article = composeArticle(item, { playerNation: campaign.founding.nation, playerNationName: campaign.founding.nationName });
  const prose = [article.standfirst, ...article.paragraphs].join(" ");
  if (!prose.includes("Saudi Arabia") || /\bArabia\b/.test(prose.replace(/Saudi Arabia/g, ""))) {
    throw new Error(`the retaliation reads as a person: ${prose}`);
  }
  return campaign;
}
