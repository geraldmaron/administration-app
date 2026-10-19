import { describe, expect, it } from "vitest";
import { apply } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { parseActConfig, actSearchOf } from "./config";
import { tariffableSectors, tariffDraft } from "./preview";
import { buildTariffPackage, readTariffPackage } from "./tariff-package";
const campaign = openingCampaign({ seedText: "tariff-package" });
/** A partner where the first law at hand orders a tariff on two different goods. */
function partner() {
    for (const nation of Object.keys(campaign.nations)) {
        if (nation === campaign.founding.nation)
            continue;
        const sectors = tariffableSectors(campaign, nation).map((edge) => edge.sector).filter((sector) => tariffDraft(campaign, nation, sector, 5)?.law.orders === "tariff");
        if (sectors.length >= 2)
            return { nation, sectors };
    }
    return undefined;
}
const measures = (state, nation) => Object.values(state.trade?.measures ?? {}).filter((measure) => measure.target === nation);
describe("a tariff order on several goods", () => {
    const found = partner();
    it("finds a partner to test on", () => {
        expect(found).toBeDefined();
    });
    it("builds one packet per good, each on the world the one before it leaves, with distinct measures", () => {
        if (!found)
            return;
        const goods = found.sectors.slice(0, 2).map((sector) => ({ sector, rate: 5 }));
        const built = buildTariffPackage(campaign, found.nation, goods);
        expect(built.ok).toBe(true);
        if (!built.ok)
            return;
        expect(built.packet).toHaveLength(2);
        const after = built.packet.reduce(apply, campaign);
        const added = measures(after, found.nation).length - measures(campaign, found.nation).length;
        expect(added).toBe(2);
        expect(built.lines.filter((line) => /^\d+\. /.test(line.label))).toHaveLength(2);
    });
    it("reads each good's law, revenue, price rise and retaliation, and sums the revenue", () => {
        if (!found)
            return;
        const reading = readTariffPackage(campaign, found.nation, found.sectors.slice(0, 2).map((sector) => ({ sector, rate: 5 })));
        expect(reading.ordered).toBe(2);
        for (const good of reading.goods) {
            expect(good.status).toBe("tariff");
            expect(good.law).not.toBe("");
            expect(good.revenue).toBeGreaterThan(0);
            expect(good.shelfPriceRise).toBeGreaterThan(0);
            expect(good.retaliation?.word).toBeTruthy();
        }
        expect(reading.revenue).toBeCloseTo(reading.goods.reduce((sum, good) => sum + (good.revenue ?? 0), 0));
    });
    it("leaves out a good the engine refuses and says why, without refusing the order", () => {
        if (!found)
            return;
        const reading = readTariffPackage(campaign, found.nation, [{ sector: found.sectors[0], rate: 5 }, { sector: "no-such-goods", rate: 5 }]);
        expect(reading.goods[1]?.status).toBe("refused");
        expect(reading.goods[1]?.reason).toBeTruthy();
        expect(buildTariffPackage(campaign, found.nation, [{ sector: found.sectors[0], rate: 5 }, { sector: "no-such-goods", rate: 5 }]).ok).toBe(true);
    });
    it("keeps the goods in the address", () => {
        const config = parseActConfig({ option: "tariff", goods: "steel:20,cars:15,steel:9,bad" });
        expect(config.goods).toEqual([{ sector: "steel", rate: 20 }, { sector: "cars", rate: 15 }]);
        expect(actSearchOf(config).goods).toBe("steel:20,cars:15");
    });
});
