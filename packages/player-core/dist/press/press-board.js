import { FOREIGN_OUTLETS, SILENCE_TOLERANCE_TURNS, pickOutletForFeedItem, pressReading, sentenceCase, selectOutlets, selectScandalBoard } from "@admin/engine";
import { chairRead } from "../dossier/chair-read.js";
import { formatRatio } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { COVERAGE_CAPTIONS, foreignPressReading } from "./foreign-coverage.js";
import { deskFilings, deskProfiles, silenceWords } from "./desks.js";
import { podiumReading } from "./press-office.js";
import { wireRows } from "./landscape.js";
export const COVERAGE_TONES = ["critical", "even", "friendly"];
export const COVERAGE_TONE_WORD = { critical: "Critical", even: "Even-handed", friendly: "Friendly" };
const TONE_OF_STANCE = { hostile: "critical", skeptical: "critical", neutral: "even", friendly: "friendly" };
export const TOPIC_LABEL = {
    "player-action": "Your actions",
    "npc-action": "Foreign governments",
    operator: "Crime and markets",
    drift: "Slow changes over time",
    press: "Incidents",
    conflict: "Wars and fronts",
    condition: "Unrest and disasters",
    governance: "Government and rules",
    pursuit: "Programs and projects",
    bloc: "Groups of countries",
};
function nationsOf(campaign, item) {
    const ids = [item.actor, item.target].filter((id) => id !== undefined && id !== campaign.founding.nation && campaign.nations[id] !== undefined);
    return [...new Set(ids)].map((id) => ({ id, name: campaign.nations[id].base.identity.name, href: place.country(id) }));
}
/** Every story filed, newest first, each with the desk that carries it, how it leans, what it is about and who it names. */
export function coverageRows(campaign) {
    return wireRows(campaign).map((row) => {
        const item = campaign.feed[row.index];
        const outletId = row.genre === "journalism" ? pickOutletForFeedItem(item)?.id : undefined;
        const tone = item.desk ? TONE_OF_STANCE[item.desk.stance] : undefined;
        return {
            index: row.index,
            headline: row.headline,
            week: item.turn - 1,
            when: row.when,
            genre: row.genre,
            source: row.source,
            ...(outletId ? { outletId } : {}),
            ...(tone ? { tone } : {}),
            topic: item.kind,
            topicLabel: TOPIC_LABEL[item.kind],
            nations: nationsOf(campaign, item),
        };
    });
}
export function filterCoverage(rows, filter) {
    return rows.filter((row) => (filter.topic === undefined || row.topic === filter.topic) &&
        (filter.outlet === undefined || row.outletId === filter.outlet) &&
        (filter.tone === undefined || row.tone === filter.tone) &&
        (filter.week === undefined || row.week === filter.week));
}
/** The topics the feed holds, with how many stories each has, most first. */
export function coverageTopics(rows) {
    const counts = new Map();
    for (const row of rows)
        counts.set(row.topic, (counts.get(row.topic) ?? 0) + 1);
    return [...counts]
        .map(([topic, count]) => ({ topic, label: TOPIC_LABEL[topic], count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
/** The last weeks of coverage, oldest first, each split by how the filing desks leaned. Weeks nothing was filed in are kept as empty columns. */
export function coverageByWeek(campaign, limit = 26) {
    const first = Math.max(2, campaign.turn - limit + 1);
    const weeks = new Map();
    for (const item of campaign.feed) {
        if (item.turn < first || item.turn > campaign.turn)
            continue;
        const bucket = weeks.get(item.turn) ?? { critical: 0, even: 0, friendly: 0, other: 0 };
        const key = item.desk ? TONE_OF_STANCE[item.desk.stance] : "other";
        weeks.set(item.turn, { ...bucket, [key]: bucket[key] + 1 });
    }
    return Array.from({ length: Math.max(0, campaign.turn - first + 1) }, (_, offset) => {
        const turn = first + offset;
        const bucket = weeks.get(turn) ?? { critical: 0, even: 0, friendly: 0, other: 0 };
        return { week: turn - 1, ...bucket, total: bucket.critical + bucket.even + bucket.friendly + bucket.other, current: turn === campaign.turn };
    });
}
function whyOf(desk) {
    const top = desk.reasons[0];
    if (!top)
        return "No single reason stands out.";
    return `${top.direction === "toward" ? "Drawn toward you" : "Pushed away"} ${top.strength} by ${top.reason}.`;
}
/** Every desk, hostile end first, with the stories it has filed and its latest. */
export function deskRows(campaign) {
    const standings = selectOutlets(campaign);
    const filed = new Map();
    for (const row of coverageRows(campaign)) {
        if (!row.outletId)
            continue;
        const tally = filed.get(row.outletId) ?? { all: 0, week: 0 };
        filed.set(row.outletId, { all: tally.all + 1, week: tally.week + (row.week === campaign.turn - 1 ? 1 : 0) });
    }
    return deskProfiles(campaign).map((desk, at) => {
        const last = deskFilings(campaign, desk.id, 1)[0];
        return {
            ...desk,
            disposition: standings[at].disposition,
            filed: filed.get(desk.id)?.all ?? 0,
            thisWeek: filed.get(desk.id)?.week ?? 0,
            ...(last ? { last } : {}),
            why: whyOf(desk),
        };
    });
}
const STAGE_WORD = { breaking: "Breaking", developing: "Developing", fading: "Fading", resolved: "Over" };
/** The stories still running against the administration, hottest first. */
export function runningStories(campaign) {
    return selectScandalBoard(campaign).map((reading) => ({
        id: reading.scandal.id,
        subject: sentenceCase(reading.scandal.subject),
        stage: reading.scandal.stage,
        stageWord: STAGE_WORD[reading.scandal.stage],
        weeks: reading.weeksRunning,
        age: reading.weeksRunning === undefined ? "Date not recorded" : reading.weeksRunning === 0 ? "Broke this week" : `Running ${reading.weeksRunning} ${reading.weeksRunning === 1 ? "week" : "weeks"}`,
        heat: reading.scandal.intensity,
        keptAliveBy: { id: reading.keptAliveBy.id, name: reading.keptAliveBy.name },
        href: place.scandal(reading.scandal.id),
    }));
}
function secretaryOf(campaign, secretary) {
    if (!secretary)
        return undefined;
    const person = campaign.people[secretary.id]?.base;
    const read = person ? chairRead(person) : undefined;
    return { ...secretary, href: place.person(secretary.id), ...(read ? { read: { tone: read.tone, word: read.word } } : {}) };
}
const share = (part, whole) => (whole > 0 ? part / whole : undefined);
/** The press in the numbers a President reads first, every one from the same desk rows, weeks and stories the page draws below. */
export function pressKpis(campaign) {
    const podium = podiumReading(campaign);
    const desks = deskRows(campaign);
    const weeks = coverageByWeek(campaign, 5);
    const week = weeks.at(-1);
    const earlier = weeks.slice(0, -1);
    const toned = week ? week.critical + week.even + week.friendly : 0;
    const stories = runningStories(campaign);
    return {
        standing: podium.standing,
        warming: desks.filter((desk) => desk.heading === "warming").length,
        cooling: desks.filter((desk) => desk.heading === "cooling").length,
        hostileDesks: desks.filter((desk) => desk.stance === "hostile").length,
        friendlyDesks: desks.filter((desk) => desk.stance === "friendly").length,
        deskCount: desks.length,
        week,
        criticalShare: week ? share(week.critical, toned) : undefined,
        friendlyShare: week ? share(week.friendly, toned) : undefined,
        earlierAverage: earlier.length > 0 ? earlier.reduce((sum, entry) => sum + entry.total, 0) / earlier.length : undefined,
        running: stories.length,
        hottest: stories[0]?.subject,
        silenceWeeks: pressReading(campaign, "silenceWeeks") ?? 0,
        silenceLimit: SILENCE_TOLERANCE_TURNS,
        silence: silenceWords(campaign),
        secretary: secretaryOf(campaign, podium.secretary),
    };
}
/** The headline of the page in a sentence, from the same readings as the tiles. */
export function pressLede(kpis) {
    const standing = `Reporters as a group sit at ${kpis.standing.percent} toward you, and ${kpis.hostileDesks} of ${kpis.deskCount} news outlets are hostile.`;
    const week = kpis.criticalShare === undefined ? "" : ` ${formatRatio(kpis.criticalShare)} of this week's coverage was critical.`;
    const running = kpis.running > 0 ? ` ${kpis.running} ${kpis.running === 1 ? "story is" : "stories are"} still running.` : "";
    return `${standing}${week}${running}`;
}
const BAND_ORDER = { hostile: 0, cool: 1, neutral: 2, warm: 3 };
/** The week's pieces from the press abroad, the coolest toward the administration first. */
export function abroadRows(campaign) {
    return foreignPressReading(campaign)
        .map((piece) => {
        const source = FOREIGN_OUTLETS.find((outlet) => outlet.id === piece.outletId);
        const name = source ? campaign.nations[source.nation]?.base.identity.name : undefined;
        return source && name
            ? [{ outletId: piece.outletId, outlet: piece.outlet, nation: { id: source.nation, name, href: place.country(source.nation) }, band: piece.band, caption: COVERAGE_CAPTIONS[piece.echo ? "echo" : piece.band], lede: piece.lede, signature: piece.signature }]
            : [];
    })
        .flat()
        .sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band] || a.outlet.localeCompare(b.outlet));
}
