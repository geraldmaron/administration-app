import { place } from "../navigation/places";
import { allReadings } from "./registry";
export function runningClocks(campaign) {
    return allReadings(campaign).map((reading) => ({
        id: reading.spec.id,
        title: reading.brief.title,
        href: place.clock(reading.spec.id),
        line: reading.brief.clockLine,
        figure: reading.brief.figure,
        stance: reading.brief.stance,
        ...(reading.due ? { due: reading.due.dueDate, urgency: reading.due.urgency } : {}),
        ...(reading.brief.window ? { window: reading.brief.window } : {}),
    }));
}
