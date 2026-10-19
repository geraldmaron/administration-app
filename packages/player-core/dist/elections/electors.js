import { otherMajorParty } from "@admin/engine";
import { stateById } from "@admin/world";
import { formatRatio } from "../format/figures";
const PARTY_LABEL = { democrat: "Democrats", republican: "Republicans" };
/** The electoral college of a decided night, administration and opposition seated by party, Democrats on the left. */
export function electorsReading(campaign, contest) {
    const anchor = campaign.congress.caucusAnchor;
    const other = otherMajorParty(anchor);
    const blocks = [
        { party: anchor, label: PARTY_LABEL[anchor], seats: contest.electoralVotes },
        { party: other, label: PARTY_LABEL[other], seats: contest.opponentVotes },
    ];
    const parties = anchor === "democrat" ? blocks : [blocks[1], blocks[0]];
    const margin = Math.abs(contest.electoralVotes - contest.opponentVotes);
    const split = contest.calls.filter((call) => call.administrationVotes > 0 && call.administrationVotes < call.electoralVotes).length;
    return {
        parties,
        majority: contest.electoralMajority,
        total: contest.electoralVotes + contest.opponentVotes,
        verdict: contest.won
            ? `You won ${contest.electoralVotes} electoral votes, ${margin} more than the other side.`
            : `You won ${contest.electoralVotes} electoral votes, ${margin} fewer than the other side.`,
        splitStates: split,
    };
}
/** Every state the night was counted in, narrowest margin first. */
export function closestCalls(contest) {
    return [...contest.calls]
        .sort((a, b) => Math.abs(a.share - 0.5) - Math.abs(b.share - 0.5) || b.electoralVotes - a.electoralVotes)
        .map((call) => {
        const forYou = call.winner === "administration";
        const points = Math.max(1, Math.round(Math.abs(call.share - 0.5) * 200));
        return {
            state: call.state,
            name: stateById.get(call.state)?.name ?? call.state,
            electoralVotes: call.electoralVotes,
            forYou,
            margin: `${forYou ? "Carried" : "Lost"} by ${points} ${points === 1 ? "point" : "points"}, ${formatRatio(forYou ? call.share : 1 - call.share)} of the two-way vote`,
        };
    });
}
/** A chamber the next President meets, seated by party from the left, as the hemicycle draws it. */
export function finaleChamberParties(chamber) {
    const of = (party) => (party === chamber.anchor ? chamber.composition.administration : chamber.composition.opposition);
    return [
        { party: "democrat", seats: of("democrat"), label: "Democrats" },
        { party: "independent", seats: chamber.composition.independent, label: "Independents" },
        { party: "republican", seats: of("republican"), label: "Republicans" },
    ].filter((party) => party.seats > 0);
}
