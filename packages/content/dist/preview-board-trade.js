import { apply, tariffPacket, selectExpectedRetaliation, selectNation, tradePhase, TRADE_SECTORS } from "@admin/engine";
import { deedsWaitedOn, sealedCampaign, withFlags } from "./preview-board.js";
import { selectScenarioTradeMeasure } from "./scenario-trade.js";
/** Let the engine create and land an actual retaliation before testing the cast. */
function retaliationBoard(gate, bordersOnly) {
    for (let seed = 0; seed < 8; seed += 1) {
        const base = sealedCampaign(`preview-trade-${seed}`);
        const neighbors = new Set(selectNation(base, base.founding.nation)?.base.geo.neighbors ?? []);
        for (const id of Object.keys(base.nations)) {
            if (id === base.founding.nation || (bordersOnly && !neighbors.has(id)))
                continue;
            for (const sector of TRADE_SECTORS) {
                if (sector.instrument !== "tariff" || sector.id === gate.responseSector)
                    continue;
                // Only the partner's answer matters here, so the order skips the statute check.
                const signed = tariffPacket(base, id, sector.id, 0.6, "s301");
                if (!signed.ok)
                    continue;
                const state = apply(base, signed.packet);
                const expected = selectExpectedRetaliation(state)[0];
                if (!expected)
                    continue;
                const due = { ...state, turn: expected.dueTurn };
                const landed = tradePhase(due).reduce((current, packet) => apply(current, packet), due);
                if (selectScenarioTradeMeasure(landed, gate, "preview") !== undefined)
                    return landed;
            }
        }
    }
    return undefined;
}
/**
 * The same board after this administration laid its answer back on the gate's
 * response goods, which is what an arc's earlier reply did before a week that
 * trades that answer away.
 */
function respondedBoard(board, gate) {
    const retaliation = selectScenarioTradeMeasure(board, gate, "preview");
    if (!retaliation)
        return undefined;
    const signed = tariffPacket(board, retaliation.actor, gate.responseSector, gate.responseRate, "s338");
    return signed.ok ? apply(board, signed.packet) : undefined;
}
export function tradeBoards(defs) {
    // A week that also needs a land neighbor is only reachable on a board where
    // that neighbor is the one that retaliated, so its board is built for them.
    const asks = defs.flatMap((def) => {
        const bordersOnly = def.conditions.some((condition) => condition.kind === "sharesBorder" && condition.present);
        const responded = def.conditions.some((condition) => condition.kind === "tariffInForce" && condition.of === "response");
        return def.conditions.filter((condition) => condition.kind === "tradeMeasure").map((gate) => ({ gate, bordersOnly, responded }));
    });
    const unique = new Map(asks.map((ask) => [JSON.stringify(ask), ask]));
    return [...unique.values()].flatMap(({ gate, bordersOnly, responded }) => {
        const landed = retaliationBoard(gate, bordersOnly);
        const board = landed && responded ? respondedBoard(landed, gate) : landed;
        // The deeds a batch's later beats wait on are told to the board too, or a
        // family's close could never be live on the only board its opener opens on.
        return board ? [withFlags(board, deedsWaitedOn(defs).flags)] : [];
    });
}
