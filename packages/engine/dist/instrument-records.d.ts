import type { ForceAssetId, MilitaryBranch, NationId, RelationshipEvent } from "@admin/world";
import type { Effect } from "./effects.js";
import type { RelationshipEffect } from "./effect-types.js";
import type { InstrumentContext, RungLevel } from "./instruments.js";
import { type CommitmentKind, type OutlayFunction } from "./state.js";
import { type CoerciveMeasureKind } from "./trade.js";
/** The name a government is called by in the record kept about it. */
export declare function named(ctx: InstrumentContext, id: NationId): string;
/**
 * The relationship movement a rung causes, with the act written into the record
 * the two governments keep of each other.
 *
 * The record is not decoration. `blockade`, `strike`, `sanctions` and `embargo`
 * are the kinds the player app's own channel decomposition has always filed by
 * and the engine never wrote, so the military and economic channels of a
 * country file were derived from movement with nothing behind it — and the war
 * opener reads the same entries to tell a second act of force from a first.
 */
export declare function acted(ctx: InstrumentContext, deltas: RelationshipEffect["deltas"], event: Omit<RelationshipEvent, "turn">): RelationshipEffect;
/**
 * What a use of force does to a board that may already be carrying a war.
 *
 * Force used inside a war already running makes that war hotter. Force used
 * where force has already been used between these two inside the answerable
 * window opens one: a blow returned and a blow repeated are both the second act
 * of the same episode, and neither capital would still call what is happening
 * an isolated incident. The first strike on its own stays an act short of a
 * war. A blockade does not come through here: closing a coast by force is an
 * act of war the first time, and its rung opens the war itself.
 *
 * Until this existed the only act on the board that opened a conflict was an
 * expeditionary invasion, whose capability gates three governments on the
 * shipped dataset can reach. So fifty capitals could blockade and strike each
 * other for two full terms and the board carried no war except one the
 * President had started — which made joining somebody else's war, the most
 * presidential decision in the game, unreachable in normal play.
 */
export declare function forceOnTheBoard(ctx: InstrumentContext, cause: string): readonly Effect[];
/**
 * The trade register's record of an economic rung, and the answer it schedules.
 *
 * The ladder and the register were two accounts of the same acts that could not
 * see each other: a sectoral tariff through the country file drew a dated,
 * cause-linked reply four weeks later, and a full embargo through the ladder
 * drew nothing at all. Both write the same measure now, and `tradePhase` lands
 * the answer to either.
 */
export declare function tradeRegister(ctx: InstrumentContext, kind: CoerciveMeasureKind): readonly Effect[];
/**
 * What acting on the President's own authority leaves behind: a report to
 * Congress that lands as a fait accompli, and a Hill that liked this
 * administration better last week.
 */
export declare function warPowersRecord(ctx: InstrumentContext, rung: RungLevel, description: string): readonly Effect[];
/**
 * The forty-eight hour obligation an introduction of forces opens.
 *
 * Separate from `warPowersRecord` above, and the separation is the statute's
 * rather than this file's: the record above fires only where the President
 * acted without a vote, and the report is owed whether or not Congress
 * authorized the action. A blockade Congress voted for still has to be
 * reported inside two days.
 */
export declare function forceIntroduction(ctx: InstrumentContext, rung: RungLevel, description: string): readonly Effect[];
/**
 * The paper trail a covert rung leaves: an act under a standing finding, or an
 * act with nothing standing over it.
 */
export declare function covertRecord(ctx: InstrumentContext, rung: RungLevel, description: string): readonly Effect[];
/**
 * What a rung leaves behind once the week it was ordered in is over.
 *
 * Four rungs at the top of the ladder do not end when the packet applies. An
 * embargo has to be enforced, an invasion has to be sustained, a guarantee has
 * to be garrisoned, and a transfer has to keep arriving. Let any of them go
 * free from the following Monday and a government can embargo twenty-two
 * countries and fight ten wars inside one term without the accounts ever
 * noticing, because the heaviest moves on the board cost exactly one week each.
 *
 * Priced as a share of national income rather than in money, so the bill is
 * the same fraction of a small country's means as of a large one's. The
 * administration's own spec is written only for the administration — the
 * treasury it is drawn on is the administration's, and there is no second one
 * for the world. Another government's heavy act writes only the forces it owes
 * a war it has joined against this target, sized from its own land force,
 * because a joiner fighting with nothing committed is the one commitment the
 * world does keep.
 */
export declare function standingCommitment(ctx: InstrumentContext, spec: {
    readonly kind: CommitmentKind;
    /** Money as a share of the actor's output a week, where an act has no costed unit of its own. */
    readonly shareOfGdp?: number;
    /** Money as USD millions a week, where the act prices what it sends (`force-costs.ts`). */
    readonly amountPerTurn?: number;
    readonly line: OutlayFunction;
    readonly rationale: string;
    readonly weeks?: number;
    readonly forces?: {
        readonly branch: MilitaryBranch;
        readonly unitType: ForceAssetId;
        readonly count: number;
    };
}): readonly Effect[];
