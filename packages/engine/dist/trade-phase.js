import { selectNation } from "./state.js";
import { tradeSector } from "./trade-sectors.js";
// --- The turn phase --------------------------------------------------------
/**
 * Trade's own week: expected retaliation arrives, and the price deviations
 * carried by each sector feed into the cost of living.
 *
 * Retaliation lands on a schedule rather than instantly, because it did:
 * partners answered a US action between two weeks and three months later, in
 * waves that tracked each escalation rather than as one reply.
 */
export const tradePhase = (state) => {
    const due = state.trade.retaliation.filter((record) => !record.landed && record.dueTurn <= state.turn);
    const packets = [];
    for (const record of due) {
        const def = tradeSector(record.sector);
        const nationName = selectNation(state, record.by)?.base.identity.name ?? String(record.by);
        packets.push({
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: {
                origin: "world",
                // The tariff being answered. This used to be an empty list — the one
                // place in the engine where a caller knew there was a cause and had no
                // way to say which, so the two halves of a trade war sat on the ledger
                // as unrelated sentences. The record carries it now.
                ...(record.causedBy ? { causeIds: [record.causedBy] } : {}),
                entities: [record.by],
                systems: ["trade"],
            },
            narration: {
                summary: `${nationName} answers with a ${Math.round(record.rate * 100)}% tariff on American ${def?.name.toLowerCase() ?? record.sector}.`,
            },
            effects: [
                {
                    kind: "trade",
                    land: record.id,
                    measure: {
                        id: `retaliation-measure:${record.id}`,
                        kind: "tariff",
                        sector: record.sector,
                        target: record.by,
                        rate: record.rate,
                        imposedTurn: state.turn,
                        imposedDate: state.calendar,
                        authority: "INST-USTR",
                        origin: "retaliation",
                        actor: record.by,
                    },
                },
                // The exporters' lost sales are theirs, not the Treasury's: they reach the
                // economy through the standing answer's export cut (`external-pressure.ts`).
                { kind: "metric", deltas: { standing: -0.008 } },
                {
                    kind: "feed",
                    items: [
                        {
                            turn: state.turn,
                            kind: "press",
                            visibility: "public",
                            headline: `${nationName} retaliates against American ${def?.name.toLowerCase() ?? "exports"}.`,
                            facts: { subject: nationName },
                        },
                    ],
                },
            ],
        });
    }
    return packets;
};
