import { describe, expect, it } from "vitest";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { joinConflict } from "./war-entry.js";
import { atWarAsParty, conflictsAsParty, homelandInvaded } from "./war-party.js";
import { underRebellionOrInvasion } from "./legislative-acts.js";
import { LOCALE_ACTS, localeAvailability } from "./locale-acts.js";
import { EXECUTIVE_ORDERS, orderAvailability } from "./orders.js";
import { selectSalience } from "./opinion.js";
import { opinionCausesFor } from "./opinion-causes.js";
import { WAR_UNEASE } from "./opinion-war.js";
import { projectForceAuthorization } from "./force-authorization.js";
import { selectCompactCalls } from "./compacts.js";
import { draftAssessment } from "./assessments.js";
import { revealedPreference } from "./revealed-preference.js";
import { conflictPhase } from "./war-tick.js";
const THIRD = "BET";
function war(aggressor, defender, joinedDefender = []) {
    return {
        id: `war:${aggressor}:${defender}:1`,
        aggressor,
        defender,
        joined: { aggressor: [], defender: joinedDefender },
        startedTurn: 1,
        cause: "a border nobody agreed on",
        intensity: 0.5,
        warSupport: { aggressor: 0.5, defender: 0.5 },
        exhaustion: { aggressor: 0, defender: 0 },
        status: "active",
        beats: [],
    };
}
function withWar(campaign, conflict) {
    return { ...campaign, conflicts: { ...campaign.conflicts, [conflict.id]: conflict } };
}
describe("which war a country is a party to", () => {
    it("counts a war the President joined as the country's war, and not as an invasion of it", () => {
        const base = buildCampaign();
        const joined = withWar(base, war(nationB.id, THIRD, [base.founding.nation]));
        expect(conflictsAsParty(joined).map((conflict) => conflict.id)).toEqual([`war:${nationB.id}:${THIRD}:1`]);
        expect(atWarAsParty(joined)).toBe(true);
        expect(homelandInvaded(joined)).toBe(false);
    });
    it("counts a war defended on the country's own soil as both", () => {
        const base = buildCampaign();
        const invaded = withWar(base, war(nationB.id, base.founding.nation));
        expect(atWarAsParty(invaded)).toBe(true);
        expect(homelandInvaded(invaded)).toBe(true);
    });
    it("answers for any nation, and leaves a country outside the war out of it", () => {
        const base = buildCampaign();
        const elsewhere = withWar(base, war(nationB.id, THIRD));
        expect(atWarAsParty(elsewhere)).toBe(false);
        expect(atWarAsParty(elsewhere, THIRD)).toBe(true);
        expect(homelandInvaded(elsewhere)).toBe(false);
    });
    it("forgets a war once it has ended", () => {
        const base = buildCampaign();
        const ended = withWar(base, { ...war(nationB.id, base.founding.nation), status: "settled", endedTurn: 2 });
        expect(atWarAsParty(ended)).toBe(false);
        expect(homelandInvaded(ended)).toBe(false);
    });
});
// --- Each site's decision, held by a behavior test on a real founded world ---
const RUS = "RUS";
const UKR = "UKR";
const EST = "EST";
const founded = foundedForBalance("war-party-census").campaign;
const US = founded.founding.nation;
/** The founded world with `aggressor` attacking `defender`, and the United States on the side it chose. */
function joined(aggressor, defender, side) {
    const conflict = openConflict(aggressor, defender, founded.turn, "An invasion across the border.");
    const before = withWar(founded, conflict);
    const result = joinConflict(before, US, conflict.id, side);
    if (!result.ok)
        throw new Error(`the join was refused: ${result.reason}`);
    return { before, after: apply(before, result.packet), conflict };
}
function order(id) {
    const found = EXECUTIVE_ORDERS.find((entry) => entry.id === id);
    if (!found)
        throw new Error(`no order ${id}`);
    return found;
}
describe("a joined war opens none of the powers written for an invasion", () => {
    const { after } = joined(RUS, UKR, "defender");
    const invaded = withWar(founded, openConflict(RUS, US, founded.turn, "Russia strikes Alaska."));
    it("leaves the Suspension Clause shut, and opens it on an invasion", () => {
        expect(underRebellionOrInvasion(after)).toBe(false);
        expect(underRebellionOrInvasion(invaded)).toBe(true);
    });
    it("does not infer federal-service findings from the existence of an invasion", () => {
        const federalize = LOCALE_ACTS.find((act) => act.predicate === "guard");
        const state = Object.keys(after.states)[0];
        // A declaration over a flood, so the statute's invasion ground is the only one left to answer.
        const declared = (campaign) => apply(campaign, {
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            narration: { summary: "A national emergency is declared over the floods." },
            effects: [{ kind: "emergency", set: { id: "emergency:flood", scope: { kind: "nation" }, cause: "flood", declaredTurn: campaign.turn, renewedTurn: campaign.turn, reason: "Floods." } }],
        });
        const refused = localeAvailability(declared(after), state, federalize);
        expect(refused.ok).toBe(false);
        expect(refused.ok ? "" : refused.missing).toMatch(/doesn't include/);
        expect(localeAvailability(declared(invaded), state, federalize).ok).toBe(false);
    });
    it("confers no foreign-asset blocking power without a named foreign-threat declaration", () => {
        const blocking = order("order-asset-seizure");
        expect(orderAvailability(after, blocking).ok).toBe(false);
        expect(orderAvailability(invaded, blocking).ok).toBe(false);
    });
});
describe("a joined war counts as a war where the country's part in it is the question", () => {
    it("puts the war on the front page, and the war term in the security judgment", () => {
        const { before, after, conflict } = joined(RUS, UKR, "defender");
        expect(selectSalience(before)).not.toContain("atWar");
        expect(selectSalience(after)).toContain("atWar");
        const warTerm = (campaign) => opinionCausesFor(campaign, "security").find((cause) => cause.key === "war")?.contribution;
        expect(warTerm(before)).toBe(0);
        // The week the country joins: the front's unease. The rally reaches the
        // headline through the record every bloc reads, not through this judgment.
        const intensity = after.conflicts[conflict.id].intensity;
        expect(warTerm(after)).toBe(Math.round(-WAR_UNEASE * intensity * 1000) / 1000);
    });
    it("lets the Hill count the war when the President asks for force against the enemy, and not against the ally", () => {
        // Joined on the attacking side, so the enemy is a government the Hill does not already count at its ceiling.
        const { after, conflict } = joined(RUS, UKR, "aggressor");
        // The same week with the country's name taken off the war, so the war is the only difference.
        const unjoined = withWar(after, { ...after.conflicts[conflict.id], joined: { aggressor: [], defender: [] } });
        const yeas = (campaign, target) => projectForceAuthorization(campaign, target).votes.reduce((sum, vote) => sum + vote.yeas, 0);
        expect(yeas(after, UKR)).toBeGreaterThan(yeas(unjoined, UKR));
        expect(yeas(after, RUS)).toBe(yeas(unjoined, RUS));
    });
    it("answers the defense compact's call by fighting beside the ally", () => {
        const { before, after } = joined(RUS, EST, "defender");
        const call = (campaign) => selectCompactCalls(campaign).find((entry) => entry.ally === EST);
        expect(call(before)?.answered).toBe(false);
        expect(call(after)?.answered).toBe(true);
    });
    it("files a friend defended in its war as a friend stood by, not left to it", () => {
        const { before, after } = joined(RUS, EST, "defender");
        const tested = revealedPreference(before);
        const stood = revealedPreference(after);
        expect(stood.evidence.friendshipTests).toBe(tested.evidence.friendshipTests);
        expect(tested.evidence.friendshipTests).toBeGreaterThan(0);
        expect(stood.honorsFriends).toBeGreaterThan(tested.honorsFriends);
    });
    it("reads a government that joined a war as a government at war, on an assessment of its intent", () => {
        const conflict = openConflict(RUS, UKR, founded.turn, "Russia invades Ukraine.");
        const onlooking = withWar(founded, conflict);
        const alternative = (campaign, id) => draftAssessment(campaign, "intent", id)?.alternative ?? "";
        const quiet = Object.keys(founded.nations).find((id) => id !== US && id !== RUS && id !== UKR && /published schedule/.test(alternative(onlooking, id)));
        if (!quiet)
            throw new Error("no government's intent reads as routine on this board");
        const beside = withWar(founded, { ...conflict, joined: { aggressor: [], defender: [quiet] } });
        expect(alternative(beside, quiet)).toMatch(/committed where they already are/);
    });
});
describe("the world's answer to aggression stays with the government that started it", () => {
    it("bills the President's country no weekly standing for joining the attack, and bills a principal invader weekly", () => {
        const standingMoves = (campaign) => conflictPhase(campaign).flatMap((packet) => packet.effects).filter((effect) => effect.kind === "metric" && effect.deltas.standing !== undefined);
        const { after } = joined(RUS, UKR, "aggressor");
        expect(standingMoves(after)).toEqual([]);
        const ours = withWar(founded, openConflict(US, UKR, founded.turn, "The United States invades."));
        expect(standingMoves(ours).length).toBeGreaterThan(0);
    });
});
const PRINCIPAL_CHECK = /\w+\??\.(aggressor|defender)\s*[!=]==|[!=]==\s*\w+\??\.(aggressor|defender)\b/;
const AGGRESSOR_CHECK = /\w+\??\.aggressor\s*[!=]==|[!=]==\s*\w+\??\.aggressor\b/;
const PARTY_READ = /conflictsAsParty|atWarAsParty|selectConflictsInvolving|selectConflictBetween|sideOf\(|joined\.(aggressor|defender)/;
/** The span a top-level declaration covers: from its name to the first line that closes at column zero. */
function bodyOf(text, site) {
    const declaration = new RegExp(`^(export )?(async )?(function ${site}\\b|const ${site}\\b)`, "m").exec(text);
    if (!declaration)
        return undefined;
    const close = text.indexOf("\n}", declaration.index);
    return { start: declaration.index, end: close < 0 ? text.length : close + 2 };
}
/** What the census finds wrong with a set of sources, one sentence per finding. */
function censusFindings(sources, census) {
    const findings = [];
    const spans = new Map();
    for (const row of census) {
        const text = sources.get(row.file);
        const body = text === undefined ? undefined : bodyOf(text, row.site);
        if (!text || !body) {
            findings.push(`${row.file}: ${row.site} is in the census and not in the source`);
            continue;
        }
        spans.set(row.file, [...(spans.get(row.file) ?? []), body]);
        const lines = text.slice(body.start, body.end).split("\n");
        if (row.decision === "party" && !PARTY_READ.test(text.slice(body.start, body.end)))
            findings.push(`${row.file}: ${row.site} is recorded as party and reads no party selector`);
        if (row.decision !== "party" && !lines.some((line) => PRINCIPAL_CHECK.test(line)))
            findings.push(`${row.file}: ${row.site} is recorded as ${row.decision} and checks no principal`);
        if (row.decision === "homeland" && lines.some((line) => AGGRESSOR_CHECK.test(line)))
            findings.push(`${row.file}: ${row.site} is recorded as homeland and reads the aggressor`);
    }
    for (const [file, text] of sources) {
        let offset = 0;
        for (const line of text.split("\n")) {
            const at = offset;
            offset += line.length + 1;
            if (!PRINCIPAL_CHECK.test(line))
                continue;
            if ((spans.get(file) ?? []).some((span) => at >= span.start && at < span.end))
                continue;
            findings.push(`${file}: an unrecorded principal check: ${line.trim()}`);
        }
    }
    return findings;
}
const CENSUS = [
    { file: "packages/engine/src/opinion.ts", site: "salienceLevels", decision: "party", why: "A war the President joined is on the front page like any war." },
    { file: "packages/engine/src/opinion-war.ts", site: "warOpinionTerms", decision: "party", why: "A country fighting beside an ally is at war, and does not feel safe." },
    { file: "packages/engine/src/opinion-war.ts", site: "launchedWar", decision: "principal", why: "Only the government that opened a war takes the smaller, shorter rally a contested case earns; a joiner is drawn in like any party." },
    { file: "packages/engine/src/force-authorization.ts", site: "threatAppeal", decision: "party", why: "Members vote for force against a government the country is already fighting, on opposite sides, joined or not." },
    { file: "packages/engine/src/assessments.ts", site: "readingFor", decision: "party", why: "A joiner's forces are committed like a principal's." },
    { file: "packages/engine/src/assessments.ts", site: "selectConflictsAbout", decision: "party", why: "The same question: is this government's army busy elsewhere." },
    { file: "packages/engine/src/compacts.ts", site: "selectCompactCalls", decision: "principal", why: "A call stands only in a war the country is not a principal of; fighting beside the ally answers it." },
    { file: "packages/engine/src/order-subjects.ts", site: "inEmergency", decision: "principal", why: "A war the country fights as a principal can supply the remaining general emergency predicate; a join alone cannot." },
    { file: "packages/engine/src/order-subjects.ts", site: "constructionOrderSubjects", decision: "principal", why: "The construction redirect is tied to a declaration over an active conflict with the country as a principal." },
    { file: "packages/engine/src/emergency.ts", site: "declareEmergency", decision: "principal", why: "An armed-forces finding can name an active conflict with the country as a principal." },
    { file: "packages/engine/src/emergency.ts", site: "declareArmedForcesEmergency", decision: "principal", why: "The special declaration requires a live conflict with the country as a principal." },
    { file: "apps/web/src/nation/policy/OrderScreen.tsx", site: "OrderScreen", decision: "principal", why: "The order desk offers an armed-forces declaration only when the country is a principal in a live conflict." },
    { file: "packages/engine/src/legislative-acts.ts", site: "underRebellionOrInvasion", decision: "homeland", why: "The Suspension Clause; homelandInvaded is its caller-to-be." },
    { file: "packages/engine/src/war-party.ts", site: "homelandInvaded", decision: "homeland", why: "The named question itself." },
    { file: "packages/engine/src/opening-world.ts", site: "refuseFoundingParty", decision: "principal", why: "The world the transition found holds no war the United States is a principal of; a join is the player's act, later." },
    { file: "packages/engine/src/revealed-preference.ts", site: "pressingAt", decision: "homeland", why: "Who was pressing the country: its own soil invaded." },
    { file: "packages/engine/src/revealed-preference.ts", site: "standings", decision: "principal", why: "A friend's war the country is no principal of is a test; fighting beside the friend keeps it." },
    { file: "packages/engine/src/war-join.ts", site: "allyJoinEffects", decision: "party", why: "Every party sits out the draw, and the President's country is never drafted by it." },
    { file: "packages/engine/src/war-tick.ts", site: "worldOpinionEffects", decision: "principal", why: "The world's answer is aimed at the government that started the war; a joiner pays once, at the join." },
    { file: "packages/engine/src/war-forces.ts", site: "presidentsPersonnel", decision: "homeland", why: "The country fights with its home share only when its own soil is the one attacked; a joiner or an aggressor fights with what it sent." },
    { file: "packages/engine/src/blocs.ts", site: "recordWeight", decision: "principal", why: "A capital fears the government that started a war; who joined it is a later wave's." },
    { file: "packages/engine/src/red-lines.ts", site: "crossingsAgainst", decision: "homeland", why: "A red line is crossed by the government that invaded its holder." },
    { file: "packages/engine/src/trade-volume.ts", site: "atWar", decision: "party", why: "Trade stops between any two parties on opposite sides." },
    { file: "apps/web/src/map/lenses/set-lenses.ts", site: "partyOf", decision: "party", why: "The war lens colors principals by side and lights the joiners, so it reads both." },
    { file: "packages/player-core/src/map/lenses/set-lenses.ts", site: "partyOf", decision: "party", why: "The war lens colors principals by side and lights the joiners, so it reads both." },
    { file: "packages/engine/src/conflicts.ts", site: "sideOf", decision: "party", why: "The definition every party reading goes through." },
    { file: "packages/engine/src/conditions.ts", site: "severityNext", decision: "party", why: "Already party-inclusive." },
    { file: "packages/engine/src/condition-onset.ts", site: "onsetCandidates", decision: "party", why: "Already party-inclusive." },
    { file: "packages/engine/src/peace.ts", site: "selectPeaceTables", decision: "party", why: "Already party-inclusive." },
    { file: "packages/engine/src/conversations.ts", site: "joinEntry", decision: "party", why: "Already party-inclusive." },
    {
        file: "packages/engine/src/external-pressure.ts",
        site: "warRole",
        decision: "party",
        why: "A joined war still weighs on growth and prices, just at a joiner's smaller share, not zero.",
    },
    {
        file: "packages/engine/src/fiscal-impulse.ts",
        site: "warOutlayShare",
        decision: "party",
        why: "The books feel a joiner's outlays too, at a joiner's smaller share, not only a principal's.",
    },
    { file: "packages/content/src/scenario-counterpart.ts", site: "conflictsByHeat", decision: "party", why: "A scenario about somebody else's war must not bind the one the country joined." },
    { file: "packages/content/src/scenario-counterpart.ts", site: "warCounterpart", decision: "party", why: "The enemy across the line, joined or principal." },
    { file: "packages/content/src/scenario-cast.ts", site: "warStateMet", decision: "principal", why: "any and none read conflictsAsParty; aggressor and defender stay with the principals." },
    { file: "packages/content/src/scenario-cast-weight.ts", site: "boostValue", decision: "party", why: "The front this government answers for, joined or its own." },
    { file: "packages/content/src/scenario-director.ts", site: "subjectPressure", decision: "party", why: "A joined war is what the government is living through." },
    { file: "packages/player-core/src/world/board-state.ts", site: "warReadings", decision: "principal", why: "Every war the country is in; a principal's war in its own words and a joined one in the joiner's." },
    { file: "packages/player-core/src/world/war-age.ts", site: "carriedWarSince", decision: "principal", why: "The table dates a war by the pair that started it; a joiner is not on the row." },
    { file: "packages/player-core/src/elections/legacy.ts", site: "usWars", decision: "party", why: "The record of the term lists every war the country fought, joined ones included." },
    { file: "packages/player-core/src/elections/legacy.ts", site: "warOutcome", decision: "party", why: "A joiner won or lost with the side it joined." },
    { file: "packages/engine/src/commitment-locations.ts", site: "deploymentLocation", decision: "principal", why: "An invasion is fought on the defender's ground whichever side a deployment came to help." },
    { file: "packages/engine/src/commodity-shocks.ts", site: "principalRole", decision: "principal", why: "Output is lost where the fighting is, in the principals' own fields and plants; a joiner's is not at risk." },
    { file: "packages/engine/src/foreign-politics.ts", site: "destabilization", decision: "party", why: "A government fighting beside an ally is at war at home too." },
    { file: "packages/engine/src/munitions.ts", site: "isParty", decision: "party", why: "A joiner fires and spends stocks like a principal." },
    { file: "packages/engine/src/opening-world.ts", site: "overlaps", decision: "principal", why: "A catalog flashpoint has only its two principals; nothing has joined a war not yet drawn." },
    { file: "packages/engine/src/border-incidents.ts", site: "eligiblePairs", decision: "principal", why: "An active war between this border's two principals already accounts for fighting there; a joiner's war elsewhere does not." },
    { file: "packages/engine/src/operators.ts", site: "hostAtWar", decision: "party", why: "A host fighting anywhere, joined or principal, has its army busy." },
];
const RAW = import.meta.glob([
    "./**/*.ts",
    "../../content/src/**/*.ts",
    "../../player-core/src/**/*.ts",
    "../../../apps/web/src/**/*.{ts,tsx}",
    "!**/*.test.ts",
    "!**/*.test.tsx",
    "!**/__fixtures__/**",
    "!**/*.gen.ts",
], { query: "?raw", import: "default", eager: true });
function repoPath(key) {
    if (key.startsWith("./"))
        return `packages/engine/src/${key.slice(2)}`;
    if (key.startsWith("../../../"))
        return key.slice("../../../".length);
    return `packages/${key.slice("../../".length)}`;
}
describe("the census of every principal-only war check", () => {
    it("finds an unrecorded site, a party row that reads no party, and a homeland row that reads the aggressor", () => {
        const planted = new Map([
            ["a.ts", "function quiet(c) {\n  return c.aggressor === us;\n}\n"],
            ["b.ts", "function claimsParty(c) {\n  return c.defender === us;\n}\n"],
            ["c.ts", "function soil(c) {\n  return c.aggressor === us || c.defender === us;\n}\n"],
        ]);
        const rows = [
            { file: "b.ts", site: "claimsParty", decision: "party", why: "" },
            { file: "c.ts", site: "soil", decision: "homeland", why: "" },
            { file: "c.ts", site: "gone", decision: "principal", why: "" },
        ];
        expect(censusFindings(planted, rows)).toEqual([
            "b.ts: claimsParty is recorded as party and reads no party selector",
            "c.ts: soil is recorded as homeland and reads the aggressor",
            "c.ts: gone is in the census and not in the source",
            "a.ts: an unrecorded principal check: return c.aggressor === us;",
        ]);
    });
    it("records a decision for every site in the source, and every recorded site still holds it", () => {
        const sources = new Map(Object.entries(RAW).map(([key, text]) => [repoPath(key), text]));
        expect(sources.size).toBeGreaterThan(400);
        expect(censusFindings(sources, CENSUS)).toEqual([]);
    });
});
