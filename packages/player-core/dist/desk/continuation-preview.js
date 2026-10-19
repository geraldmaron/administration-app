import { compareDates } from "@admin/engine";
import { attentionItems } from "./attention";
/**
 * The nearest dated matter not already presented this week — the soonest
 * date Continue could run into. Undefined on a board with nothing dated
 * ahead, which is a true quiet stretch, not a gap in this reading.
 */
export function continuationHorizon(campaign) {
    const dated = attentionItems(campaign)
        .filter((item) => item.urgency === "ambient" && item.dueDate !== undefined)
        .sort((a, b) => compareDates(a.dueDate, b.dueDate));
    const nearest = dated[0];
    return nearest ? { title: nearest.title, dueDate: nearest.dueDate } : undefined;
}
