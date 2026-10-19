import { elapsedDays, weeksFor } from "@admin/engine";
import { place } from "../navigation/places";
// Why the world stopped, in words. The engine records one of four codes; a
// screen that printed the code ("stopped because attention") told the player
// nothing about what to do next.
/** How long the world ran, in the unit a player thinks in: whole weeks when it ran whole weeks, else days. */
export function spanWords(brief) {
    if (brief.elapsedDays <= 0)
        return "no time";
    const weeks = weeksFor(brief.elapsedDays, "floor");
    if (weeks > 0 && elapsedDays(weeks) === brief.elapsedDays)
        return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
    return `${brief.elapsedDays} ${brief.elapsedDays === 1 ? "day" : "days"}`;
}
/** The stop's reason as one sentence. */
export function stopWords(brief) {
    if (brief.stopReason === "ended")
        return "It stopped because your presidency ended.";
    if (brief.stopReason === "horizon")
        return "It stopped because the time you set ran out. Nothing needed you.";
    if (brief.stopReason === "election")
        return "It stopped for Election Day.";
    const count = brief.stop.presented.length;
    return count === 1 ? "It stopped because one item needs you." : `It stopped because ${count} items need you.`;
}
/**
 * Where a matter is answered, among the Brief's own screens: a decision on its
 * decision screen, a case or a statutory clock on its clock screen, a story on
 * its scandal screen. Anything else opens where its row says it does.
 */
export function matterDoor(matter, fallback) {
    const [kind, ...rest] = matter.id.split(":");
    const id = rest.join(":");
    switch (kind) {
        case "scenario":
            return place.decision(id);
        case "case":
            return place.clock(matter.id);
        case "summons":
            return place.clock(id);
        case "scandal":
            return place.scandal(id);
        case "removal":
            return place.approval();
        default:
            return fallback;
    }
}
/** What a run stopped on, each with the screen that answers it. */
export function stopLines(brief, hrefOf = () => undefined) {
    return brief.stop.presented.map((matter) => {
        const href = matterDoor(matter, hrefOf(matter.id));
        return { id: matter.id, title: matter.title, reason: matter.reason, urgency: matter.urgency, ...(href ? { href } : {}) };
    });
}
