import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { withTariffFinding } from "./__fixtures__/tariff.js";
import { addDays, compareDates } from "./clock.js";
import { elapsedDays } from "./pace.js";
import { apply } from "./effects.js";
import { fittingTariffStatute, imposeTariff, openTariffInvestigation, tariffFindingPhase, tariffStatuteStanding, } from "./tariff-orders.js";
import { TARIFF_STATUTES } from "./tariff-statutes.js";
import { suppliersOf } from "./trade.js";
import { expireTradeMeasures } from "./trade-effects.js";
const PARTNER = "ALP";
const TRADED = "textiles-apparel";
/** The partner's own tariff on American goods, the thing Section 338 answers. */
function withPartnerTariff(campaign) {
    const measure = {
        id: "retaliation-measure:fixture", kind: "tariff", sector: TRADED, target: PARTNER, rate: 0.2,
        imposedTurn: campaign.turn, imposedDate: campaign.calendar, authority: "INST-USTR", origin: "retaliation", actor: PARTNER,
    };
    return { ...campaign, trade: { ...campaign.trade, measures: { ...campaign.trade.measures, [measure.id]: measure } } };
}
function atDate(campaign, date) {
    return { ...campaign, calendar: date };
}
describe("a tariff rests on a statute", () => {
    it("refuses an investigated statute with no finding, and says who must find what", () => {
        const campaign = buildCampaign();
        const result = imposeTariff(campaign, "s301", PARTNER, TRADED, 0.1);
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toContain("the Trade Representative");
    });
    it("opens an investigation that is due on the statute's clock and refuses a second while it runs", () => {
        const campaign = buildCampaign();
        const opened = openTariffInvestigation(campaign, "s301", PARTNER, TRADED);
        expect(opened.ok).toBe(true);
        if (!opened.ok)
            return;
        expect(opened.finding.dueDate).toEqual(addDays(campaign.calendar, elapsedDays(TARIFF_STATUTES.s301.investigation.weeks)));
        const after = apply(campaign, opened.packet);
        expect(tariffStatuteStanding(after, "s301", PARTNER, TRADED).investigation).toBe("under-way");
        expect(openTariffInvestigation(after, "s301", PARTNER, TRADED).ok).toBe(false);
        expect(tariffFindingPhase(after)).toHaveLength(0);
    });
    it("rules on a due investigation, and an affirmative finding lets the tariff through", () => {
        const campaign = withPartnerTariff(buildCampaign());
        const opened = openTariffInvestigation(campaign, "s301", PARTNER, TRADED);
        if (!opened.ok)
            throw new Error(opened.reason);
        const due = atDate(apply(campaign, opened.packet), opened.finding.dueDate);
        const rulings = tariffFindingPhase(due);
        expect(rulings).toHaveLength(1);
        const ruled = rulings.reduce((state, packet) => apply(state, packet), due);
        const finding = Object.values(ruled.trade.findings ?? {})[0];
        // A partner with its own tariff on American goods is an unfair practice on any reading.
        expect(finding.outcome).toBe("affirmative");
        const imposed = imposeTariff(ruled, "s301", PARTNER, TRADED, 0.25);
        expect(imposed.ok).toBe(true);
        if (!imposed.ok)
            return;
        const measure = imposed.packet.effects.find((effect) => effect.kind === "trade" && effect.measure);
        expect(measure?.kind === "trade" ? measure.measure?.statute : undefined).toBe("s301");
    });
    it("holds Section 122 to 15 percent and 150 days", () => {
        const campaign = buildCampaign();
        const standing = tariffStatuteStanding(campaign, "s122", PARTNER, TRADED);
        if (!standing.available) {
            // A partner that buys more from us than it sells can't be singled out.
            expect(standing.reason).toContain("can't single it out");
            return;
        }
        expect(imposeTariff(campaign, "s122", PARTNER, TRADED, 0.2).ok).toBe(false);
        const imposed = imposeTariff(campaign, "s122", PARTNER, TRADED, 0.15);
        expect(imposed.ok).toBe(true);
        if (!imposed.ok)
            return;
        const effect = imposed.packet.effects.find((entry) => entry.kind === "trade" && entry.measure);
        const expires = effect?.kind === "trade" ? effect.measure?.expiresDate : undefined;
        expect(expires).toEqual(addDays(campaign.calendar, 150));
    });
    it("lets Section 338 answer only a partner that has its own tariff on American goods, up to 50 percent", () => {
        const plain = buildCampaign();
        expect(tariffStatuteStanding(plain, "s338", PARTNER, TRADED).available).toBe(false);
        const answered = withPartnerTariff(plain);
        expect(imposeTariff(answered, "s338", PARTNER, TRADED, 0.6).ok).toBe(false);
        expect(imposeTariff(answered, "s338", PARTNER, TRADED, 0.5).ok).toBe(true);
        expect(fittingTariffStatute(answered, PARTNER, TRADED, 0.1)).toBe("s338");
    });
    it("lands a safeguard on every country that sells the goods", () => {
        const campaign = buildCampaign();
        const finding = {
            id: `finding:s201:${TRADED}:fixture`, statute: "s201", sector: TRADED, openedTurn: campaign.turn,
            openedDate: campaign.calendar, dueDate: campaign.calendar, outcome: "affirmative", decidedDate: campaign.calendar,
        };
        const found = { ...campaign, trade: { ...campaign.trade, findings: { [finding.id]: finding } } };
        const imposed = imposeTariff(found, "s201", PARTNER, TRADED, 0.2);
        expect(imposed.ok).toBe(true);
        if (!imposed.ok)
            return;
        const targets = imposed.packet.effects.flatMap((effect) => (effect.kind === "trade" && effect.measure ? [effect.measure.target] : []));
        expect(new Set(targets)).toEqual(new Set(suppliersOf(found, TRADED).map((edge) => edge.partner)));
        expect(imposeTariff(found, "s201", PARTNER, TRADED, 0.6).ok).toBe(false);
    });
    it("finds nothing to fit when no statute's finding holds", () => {
        const campaign = buildCampaign();
        const fitted = fittingTariffStatute(campaign, PARTNER, TRADED, 0.5);
        // Above Section 122's cap and with no finding or partner tariff, no law carries half again.
        expect(fitted).toBeUndefined();
        expect(fittingTariffStatute(withTariffFinding(campaign, PARTNER), PARTNER, TRADED, 0.5)).toBe("s301");
    });
    it("keeps the finding's due date ahead of the order date", () => {
        const campaign = buildCampaign();
        for (const statute of ["s232", "s301", "s201"]) {
            const opened = openTariffInvestigation(campaign, statute, PARTNER, TRADED);
            if (!opened.ok)
                continue;
            expect(compareDates(opened.finding.dueDate, campaign.calendar)).toBeGreaterThan(0);
        }
    });
    it("takes a lapsed tariff's price increase back off the shelf, and keeps the answer it drew", () => {
        const campaign = buildCampaign();
        const finding = {
            id: `finding:s201:${TRADED}:fixture`, statute: "s201", sector: TRADED, openedTurn: campaign.turn,
            openedDate: campaign.calendar, dueDate: campaign.calendar, outcome: "affirmative", decidedDate: campaign.calendar,
        };
        const found = { ...campaign, trade: { ...campaign.trade, findings: { [finding.id]: finding } } };
        const imposed = imposeTariff(found, "s201", PARTNER, TRADED, 0.2);
        if (!imposed.ok)
            throw new Error(imposed.reason);
        const signed = apply(found, imposed.packet);
        expect(signed.trade.sectorPrice[TRADED] ?? 0).toBeGreaterThan(0);
        const expires = Object.values(signed.trade.measures).find((measure) => measure.origin === "us")?.expiresDate;
        if (!expires)
            throw new Error("A safeguard carries its term");
        const dayBefore = expireTradeMeasures(atDate(signed, addDays(expires, -1)));
        expect(dayBefore.trade.sectorPrice[TRADED]).toBe(signed.trade.sectorPrice[TRADED]);
        const lapsed = expireTradeMeasures(atDate(signed, expires));
        expect(lapsed.trade.sectorPrice[TRADED] ?? 0).toBe(found.trade.sectorPrice[TRADED] ?? 0);
        expect(Object.values(lapsed.trade.measures).filter((measure) => measure.origin === "us").every((measure) => measure.liftedTurn !== undefined)).toBe(true);
        expect(lapsed.trade.retaliation).toEqual(signed.trade.retaliation);
    });
});
