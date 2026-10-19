import { TREATY_TERMS, counterpartTrustFloor, engagementHold, hasIntelOnNation, selectRelationship } from "@admin/engine";
import { stanceForPressure, stanceForTrust, trustWord } from "../format/figures";
import { configUnder } from "./catalogue";
import { instrumentDraft, instrumentProjection } from "./preview";
const LABELS = { ourTrust: "Your trust in them", theirTrust: "Their trust in you", tension: "Tension between you" };
const TENSION_WORDS = { favorable: "Low", neutral: "Manageable", caution: "Rising", adverse: "High" };
function bandWord(reading, value) {
    return reading === "tension" ? TENSION_WORDS[stanceForPressure(value)] : trustWord(stanceForTrust(value));
}
function requirement(reading, have, need) {
    return {
        reading,
        label: LABELS[reading],
        ...(have === undefined ? {} : { have }),
        need,
        haveWord: have === undefined ? "Unknown" : bandWord(reading, have),
        needWord: bandWord(reading, need),
        met: have !== undefined && have >= need,
    };
}
function theirSide(campaign, nation, value) {
    return hasIntelOnNation(campaign, nation) ? value : undefined;
}
function engagementRequirements(campaign, nation, hold) {
    switch (hold.kind) {
        case "host-distrusts":
            return [requirement("theirTrust", theirSide(campaign, nation, hold.theirs), hold.need)];
        case "too-little-trust":
            return [requirement("ourTrust", hold.ours, hold.need), requirement("theirTrust", theirSide(campaign, nation, hold.theirs), hold.need)];
        case "too-calm":
            return [requirement("tension", hold.tension, hold.need)];
        case "cooldown":
        case "no-relationship":
            return [];
    }
}
function requirementsOf(campaign, nation, option, config) {
    const ref = option.ref;
    const home = campaign.founding.nation;
    if (ref.kind === "engagement") {
        const hold = engagementHold(campaign, { actor: home, target: nation, kind: ref.engagement });
        return hold ? engagementRequirements(campaign, nation, hold) : [];
    }
    if (ref.kind === "treaty") {
        const ours = selectRelationship(campaign, home, nation)?.trust;
        const need = TREATY_TERMS[ref.treaty].minTrust;
        if (ours !== undefined && ours < need)
            return [requirement("ourTrust", ours, need)];
        // Past our own floor, a refusal is theirs: where their trust would have to stand for them to sign, if trust can get them there at all.
        const theirs = selectRelationship(campaign, nation, home)?.trust;
        const floor = counterpartTrustFloor(campaign, nation, ref.treaty);
        return theirs !== undefined && floor !== undefined && floor > theirs && floor <= 1 ? [requirement("theirTrust", theirSide(campaign, nation, theirs), floor)] : [];
    }
    if (ref.kind === "instrument") {
        const projected = instrumentProjection(campaign, instrumentDraft(campaign, nation, ref.instrument, ref.rung, config.count, configUnder(ref, config)));
        return !projected.ok && projected.shortfall ? [requirement("ourTrust", projected.shortfall.have, projected.shortfall.need)] : [];
    }
    return [];
}
function buildersFor(readings, options, locked) {
    const moves = (mark) => readings.includes(mark.key) && mark.key !== "tension" && mark.delta > 0;
    return options
        .filter((entry) => entry.option.id !== locked.id && entry.preview.state === "open")
        .flatMap((entry) => {
        const marks = entry.effects?.marks.filter(moves) ?? [];
        if (marks.length === 0)
            return [];
        const steps = Object.fromEntries(marks.map((mark) => [mark.key, mark.delta]));
        return [{ option: entry.option, steps, step: Math.max(...marks.map((mark) => mark.delta)) }];
    })
        .sort((a, b) => b.step - a.step);
}
/** The open act that moves one reading furthest, for the tick on that reading's meter. */
export function bestBuilderFor(prerequisite, reading) {
    return [...prerequisite.builders].filter((builder) => builder.steps[reading] !== undefined).sort((a, b) => b.steps[reading] - a.steps[reading])[0];
}
function lineOf(unmet, buildable, builders) {
    const needs = unmet.map((entry) => `${entry.label.toLowerCase()} to reach ${entry.needWord}`).join(" and ");
    if (!buildable)
        return "This one isn't needed right now. A summit is for two governments that are badly at odds.";
    const unknown = unmet.some((entry) => entry.have === undefined);
    const first = `This needs ${needs}.`;
    if (builders.length === 0)
        return `${first} Nothing you can do this week moves it. Check again next week.`;
    const best = builders[0];
    const closes = !unknown && unmet.every((entry) => (entry.have ?? 0) + (best.steps[entry.reading] ?? 0) >= entry.need);
    return `${first} ${best.option.name} is the biggest step you can take now.${closes ? " One would be enough." : " It will take more than one step to get there."}`;
}
/** What a locked option is waiting on, or undefined when it is open or the gate that closed it is not a reading of the relationship. */
export function prerequisiteOf(campaign, nation, entry, options, config = {}) {
    if (entry.preview.state !== "held")
        return undefined;
    const requirements = requirementsOf(campaign, nation, entry.option, config);
    const unmet = requirements.filter((item) => !item.met);
    if (unmet.length === 0)
        return undefined;
    const buildable = unmet.every((item) => item.reading !== "tension");
    const builders = buildable ? buildersFor(unmet.map((item) => item.reading), options, entry.option) : [];
    return { requirements, buildable, builders, line: lineOf(unmet, buildable, builders) };
}
