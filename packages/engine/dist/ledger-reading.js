import { INSTRUMENT_RUNGS } from "./instruments.js";
import { selectNation, selectPlayerLedger, } from "./state.js";
const RUNG_BY_NAME = new Map(INSTRUMENT_RUNGS.map((definition) => [definition.name, { instrument: definition.instrument, rung: definition.rung }]));
// The ladder's own narration, used where an attempt is committed without going
// through the resolver: it states the rung outright and says nothing of outcome.
const LADDER_SHAPE = /^.+ uses (.+) \((?:diplomatic|economic|covert|military) rung [1-5]\) against (.+)\.$/;
// The resolver's two generic branches.
const LANDED_SHAPE = /^.+ uses (.+) against (.+), and it lands\.$/;
const FAILED_SHAPE = /^.+ attempts (.+?) against (.+?)\. /;
function parseNarration(description) {
    const ladder = LADDER_SHAPE.exec(description);
    if (ladder)
        return refFrom(ladder[1], ladder[2]);
    const landed = LANDED_SHAPE.exec(description);
    if (landed)
        return refFrom(landed[1], landed[2], true);
    const failed = FAILED_SHAPE.exec(description);
    if (failed)
        return refFrom(failed[1], failed[2], false);
    return undefined;
}
function refFrom(rungName, targetName, landed) {
    const ref = RUNG_BY_NAME.get(rungName);
    if (!ref)
        return undefined;
    return { ref, targetName, ...(landed === undefined ? {} : { landed }) };
}
function nationsByName(campaign) {
    const byName = new Map();
    for (const id of Object.keys(campaign.nations)) {
        const name = selectNation(campaign, id)?.base.identity.name;
        if (name !== undefined)
            byName.set(name, id);
    }
    return byName;
}
// The fallback, reached only where the entry does not state its own commitment.
function parsedCommitment(entry, byName) {
    const parsed = parseNarration(entry.description);
    if (!parsed)
        return undefined;
    const target = byName.get(parsed.targetName);
    return {
        turn: entry.turn,
        instrument: parsed.ref.instrument,
        rung: parsed.ref.rung,
        ...(target === undefined ? {} : { target }),
        ...(parsed.landed === undefined ? {} : { landed: parsed.landed }),
    };
}
function commitmentFrom(entry, byName) {
    const stated = entry.commitment;
    if (!stated)
        return parsedCommitment(entry, byName);
    return {
        turn: entry.turn,
        instrument: stated.instrument,
        rung: stated.rung,
        target: stated.target,
        ...(stated.landed === undefined ? {} : { landed: stated.landed }),
        ...(entry.counsel ? { counsel: entry.counsel } : {}),
    };
}
/**
 * Every instrument commitment this administration made that the record can
 * still be read for, oldest first.
 */
export function readPlayerCommitments(campaign) {
    const byName = nationsByName(campaign);
    return selectPlayerLedger(campaign).flatMap((entry) => {
        const commitment = commitmentFrom(entry, byName);
        return commitment ? [commitment] : [];
    });
}
