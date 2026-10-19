import { lobbyFavorWhat } from "./lobbying-favors.js";
import { EMPTY_TIE } from "./ties.js";
function favorOf(promise) {
    const status = promise.status === "open" ? "open" : promise.status === "kept" ? "repaid" : "defaulted";
    return {
        id: promise.id,
        direction: "owed-by-president",
        what: lobbyFavorWhat(promise.title),
        openedTurn: promise.openedTurn,
        status,
        ...(promise.settledTurn !== undefined ? { settledTurn: promise.settledTurn } : {}),
        billId: promise.billId,
        actId: promise.actId,
        post: promise.post,
        lobbyId: promise.lobbyId,
        reservedTreasury: promise.reservedTreasury,
        ...(promise.account ? { account: promise.account } : {}),
    };
}
function withRapport(people, figure) {
    const runtime = people[figure.person];
    if (!runtime || figure.disposition === undefined)
        return people;
    const tie = runtime.tie ?? EMPTY_TIE;
    return { ...people, [figure.person]: { ...runtime, tie: { ...tie, rapport: figure.disposition } } };
}
function withFavor(people, holder, promise) {
    const runtime = holder === undefined ? undefined : people[holder];
    if (!runtime)
        return people;
    const tie = runtime.tie ?? EMPTY_TIE;
    return { ...people, [holder]: { ...runtime, tie: { ...tie, favors: [...tie.favors, favorOf(promise)] } } };
}
/**
 * Move every figure's disposition and every promise onto the people they
 * belong to. A promise whose post nobody holds any longer has no member to
 * owe, and is the one thing a pre-v63 save can lose on the way in; a promise
 * did not record who it was made with, only where they sat.
 */
export function withTieLedger(campaign) {
    const congress = campaign.congress;
    const holderOf = new Map(congress.leadership.map((figure) => [figure.post, figure.person]));
    const rapport = congress.leadership.reduce(withRapport, { ...campaign.people });
    const people = (congress.promises ?? []).reduce((current, promise) => withFavor(current, holderOf.get(promise.post), promise), rapport);
    const { promises: _promises, ...rest } = congress;
    const leadership = congress.leadership.map(({ disposition: _disposition, ...figure }) => figure);
    return { ...campaign, people, congress: { ...rest, leadership } };
}
