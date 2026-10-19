import { DAYS_PER_TURN, daysBetween, formatGameDateShort, turnsFor } from "@admin/engine";
import { PLACES, place } from "../navigation/places";
import { dayCount, stanceForUrgency, weekCount } from "./clock-math";
import { dueClocks, stopsTheWeek } from "./registry";
/**
 * The statutory clocks, as rows of "what needs the President".
 *
 * The summons layer used to answer that question on its own — its own ranking,
 * its own urgency words, its own dedupe rule negotiated by hand against the
 * Desk's — and the two could disagree about what was loud. This is the adapter
 * that ends that: a clock produces the same row a standing condition does, and
 * one composer ranks and caps them together.
 *
 * Only the due half is read. Composing fourteen briefs to decide whether the
 * world may keep running would run the whole advisor on every tick.
 */
/** How a clock's urgency reads on the engine's scale of whether time may run. */
function urgencyOf(clock) {
    // A clock on the calendar is the world's shape, not a demand: an election
    // eleven months out belongs in the feed and must never cost one of the three.
    // Neither may a clock the office cannot answer, however close it is.
    if (clock.due.urgency === "standing" || !clock.spec.answerable)
        return "ambient";
    // Constitutionally irreversible on lapse — the money stops, the force must
    // come home, the seat is contested — and only once it has actually landed.
    return stopsTheWeek(clock) ? "hard" : "soft";
}
/**
 * The countdown in words, day-precise where the statute is.
 *
 * A clock whose date has passed is running rather than owed: an appropriation
 * that lapsed, a treaty the Senate never took up and a closed government are
 * all counting up, and phrasing them as overdue deadlines would put a date on
 * something that has none.
 */
export function dueSentence(today, due) {
    const days = daysBetween(today, due.dueDate);
    if (days < 0)
        return `Running since ${formatGameDateShort(due.dueDate)}.`;
    if (days === 0)
        return `Due today, ${formatGameDateShort(due.dueDate)}.`;
    if (days === 1)
        return `Due tomorrow, ${formatGameDateShort(due.dueDate)}.`;
    return `Due ${formatGameDateShort(due.dueDate)}, ${days} days away.`;
}
/**
 * The headline figure: days inside a fortnight, weeks beyond it.
 *
 * The unit changes because the reading does. Six days and two days are a
 * different week's work and used to round to the same figure; three months and
 * fourteen weeks are the same fact and counting the days would be false
 * precision on a date nobody plans a Tuesday around.
 */
export function dueFigure(today, due) {
    const days = daysBetween(today, due.dueDate);
    if (days < 0)
        return "Lapsed";
    if (days === 0)
        return "Due";
    if (days <= 2 * DAYS_PER_TURN)
        return dayCount(days);
    return weekCount(turnsFor(days));
}
export function summonsItems(campaign) {
    return dueClocks(campaign).map((clock) => {
        const owner = PLACES[clock.spec.owner];
        return {
            id: `summons:${clock.spec.id}`,
            source: clock.spec.source,
            urgency: urgencyOf(clock),
            subject: clock.due.subject,
            title: clock.due.title,
            reason: dueSentence(campaign.calendar, clock.due),
            // The clock screen, whose door opens the record the clock counts on; the owning place shows the place, not the record.
            href: place.clock(clock.spec.id),
            stance: stanceForUrgency(clock.due.urgency),
            figure: dueFigure(campaign.calendar, clock.due),
            icon: owner.icon,
            dueDate: clock.due.dueDate,
            summons: clock.spec.id,
        };
    });
}
