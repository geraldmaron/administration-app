import { describe, expect, it } from "vitest";
import { makeCampaignSeed, sealFounding } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { foundingOptions, openingChoices } from "../campaign/founding-options";
import { GLOSSARY } from "../glossary/index";
import { entityEntries, resolveRef } from "./entity-entries";
import { SEARCH_GROUPS, chapterEntries, groupResults, placeEntries, search, termEntries } from "./search-index";
const built = new Set(["/", "/brief", "/washington", "/nation", "/world", "/record", "/founding", "/administrations", "/settings", "/recovery"]);
const entries = [...placeEntries((href) => built.has(href)), ...termEntries(GLOSSARY)];
describe("search", () => {
    it("offers only places whose screen exists", () => {
        const hrefs = entries.flatMap((entry) => (entry.kind === "place" ? [entry.href] : []));
        expect(hrefs).toContain("/settings");
        expect(hrefs).not.toContain("/washington/congress");
    });
    it("lists places for an empty query", () => {
        const results = search(entries, "  ");
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((entry) => entry.kind === "place")).toBe(true);
    });
    it("finds a place by a word that is not its name", () => {
        expect(search(entries, "camera")[0]?.title).toBe("Settings");
    });
    it("maps trade measures to both the nation and the world", () => {
        const titles = search(entries, "tariff").filter((entry) => entry.kind === "place").map((entry) => entry.title);
        expect(titles).toEqual(expect.arrayContaining(["Nation", "World"]));
    });
    it("finds a glossary term by its name before one that only mentions it", () => {
        const results = search(entries, "inspector general");
        expect(results[0]?.kind).toBe("term");
        expect(results[0]?.title).toBe("Inspector general");
    });
    it("sends approval and polls to the Nation screen, since approval has no page of its own", () => {
        const withNation = [...placeEntries((href) => built.has(href) || href === "/nation"), ...termEntries(GLOSSARY)];
        for (const word of ["approval", "polls", "public opinion"]) {
            const places = search(withNation, word).flatMap((entry) => (entry.kind === "place" ? [entry.href] : []));
            expect(places).toContain("/nation");
        }
    });
    it("finds nothing for nonsense", () => {
        expect(search(entries, "zzqqxx")).toEqual([]);
    });
});
describe("handbook search", () => {
    const withHandbook = [...placeEntries((href) => built.has(href) || href === "/handbook"), ...chapterEntries((href) => href === "/handbook"), ...termEntries(GLOSSARY)];
    it("finds the Handbook by the words a player would use for it", () => {
        for (const word of ["help", "guide", "how to play", "manual"]) {
            expect(search(withHandbook, word).some((entry) => entry.kind === "place" && entry.href === "/handbook")).toBe(true);
        }
    });
    it("opens a chapter from its title", () => {
        const first = search(withHandbook, "Your first week")[0];
        expect(first?.kind === "place" && first.href).toBe("/handbook/first-week");
    });
    it("offers no chapters where the Handbook has no screen", () => {
        expect(chapterEntries(() => false)).toEqual([]);
    });
});
describe("campaign search", () => {
    const seed = makeCampaignSeed("search-index");
    const choices = openingChoices(foundingOptions(seed));
    const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
    const all = [...placeEntries((href) => built.has(href)), ...entityEntries(campaign), ...termEntries(GLOSSARY)];
    it("finds a state, a country, an office and a command by name", () => {
        expect(search(all, "Ohio").some((entry) => entry.kind === "state" && entry.href === "/nation/state/OH")).toBe(true);
        expect(search(all, "France").some((entry) => entry.kind === "country")).toBe(true);
        expect(search(all, "Department of State").some((entry) => entry.kind === "office")).toBe(true);
        expect(search(all, "Northern Command").some((entry) => entry.kind === "command")).toBe(true);
    });
    it("finds a member of Congress by name and by the state they sit for", () => {
        const member = all.find((entry) => entry.kind === "member");
        expect(member).toBeDefined();
        expect(search(all, member.title).some((entry) => entry.id === member.id)).toBe(true);
        expect(search(all, "senator").some((entry) => entry.kind === "member")).toBe(true);
    });
    it("groups results under their heading in a fixed order", () => {
        const groups = groupResults(search(all, "a"));
        const order = SEARCH_GROUPS.map((group) => group.kind);
        const kinds = groups.map((group) => group.kind);
        expect(kinds).toEqual(order.filter((kind) => kinds.includes(kind)));
        expect(groups.every((group) => group.entries.every((entry) => entry.kind === group.kind))).toBe(true);
    });
    it("names a reference only when the campaign holds the thing", () => {
        expect(resolveRef(campaign, { kind: "state", id: "OH" })?.href).toBe("/nation/state/OH");
        expect(resolveRef(campaign, { kind: "war", id: "war:none" })).toBeUndefined();
    });
});
