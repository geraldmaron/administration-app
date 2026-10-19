import { FOREIGN_OUTLETS, foreignCoverage, foreignPiece, foreignPressWeek, leadershipArticleOf, selectForeignSeat, selectLeadershipChanges, } from "@admin/engine";
import { formatDate } from "../format/figures";
// How the world's press covers the President, and who governs the capitals it
// files from. A band is all a screen may print about coverage: the capped
// figure under it is not a fact a reader has. A seat's date is printed to the
// precision it was known: a seat the leader table describes, or one resolved
// at the seal from the table's schedule, is dated to its month, because the
// day inside the month is the calendar's rule and not a reported fact.
/** "How they cover you": what each band says on a country file, and what a state press says instead. */
export const COVERAGE_CAPTIONS = {
    warm: "Their press is giving you the benefit of the doubt.",
    neutral: "Their press reports what you do without taking a side.",
    cool: "Their press doubts you, and says so.",
    hostile: "Their press treats you as a problem for their country.",
    echo: "Their press speaks for their government, so it covers you the way that government sees you.",
};
/** One nation's coverage of the President. Undefined until the press abroad has first filed, and for the President's own country. */
export function foreignCoverageReading(campaign, nation) {
    const coverage = foreignCoverage(campaign, nation);
    if (!coverage)
        return undefined;
    const outlet = coverage.outlet;
    const piece = outlet ? foreignPiece(campaign, outlet) : undefined;
    return {
        nation,
        band: coverage.band,
        caption: COVERAGE_CAPTIONS[coverage.echo ? "echo" : coverage.band],
        echo: coverage.echo,
        ...(outlet ? { outlet: { id: outlet.id, name: outlet.name, kind: outlet.kind, beat: outlet.beat } } : {}),
        ...(piece ? { piece } : {}),
    };
}
/** The week's pieces from every outlet on the foreign roster, for the press room. */
export function foreignPressReading(campaign) {
    return foreignPressWeek(campaign, FOREIGN_OUTLETS);
}
/** A date to its month, "March 2027", off the same month names every other date is printed with. */
export function monthOf(date) {
    return formatDate({ ...date, day: 1 }).replace(/ 1, /, " ");
}
/** "In office since", to the precision the seat's date was known, with where it came from. */
function sinceLine(seat) {
    switch (seat.provenance) {
        case "table":
            return `In office since at least ${monthOf(seat.since)}.`;
        case "projected":
            return `In office since about ${monthOf(seat.since)}, a guess based on their last election.`;
        default:
            return `In office since ${formatDate(seat.since)}.`;
    }
}
/** Who governs a country and how they came to: the seat's date and the stories of its changes. */
export function foreignLeadershipReading(campaign, nation) {
    const seat = selectForeignSeat(campaign, nation);
    if (!seat)
        return undefined;
    return {
        since: sinceLine(seat),
        ...(seat.next ? { nextSelection: monthOf(seat.next) } : {}),
        articles: selectLeadershipChanges(campaign, nation).map((change) => leadershipArticleOf(campaign, change)),
    };
}
