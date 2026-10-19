import type { NationId } from "@admin/world";
import type { Campaign, Conflict, WarLossBand } from "./state.js";
/**
 * A war's rally, in valence units: added to the record every bloc reads, so
 * each bloc moves by its own slope, the identifiers least, and a more polarized
 * public rallies less. Not a security term: a rally is the country closing
 * ranks behind its government, which is approval of the government, and
 * billing it through a judgment as well would charge it twice.
 *
 * A war this government opened rallies the way Iraq did in 2003: Gallup 58 on
 * March 14 to 71 on March 22 and 59 by July, which fits an impulse of 1.86 with
 * a seven-week half-life at that era's division (owner, 2026-10-13: a damped,
 * Iraq-fitted rally for a self-started war). A war the country is drawn into
 * takes the design's "war with a stated cause" class, 2.2 halving over twenty
 * weeks, a judgment between the Iraq and Gulf War fits (Gulf War: 2.36, twenty
 * weeks).
 */
export declare const RALLY: {
    readonly launched: {
        readonly valence: 1.86;
        readonly halfLifeWeeks: 7;
    };
    readonly drawnIn: {
        readonly valence: 2.2;
        readonly halfLifeWeeks: 20;
    };
};
/** Planning value: the unease a front at full intensity costs the security judgment. */
export declare const WAR_UNEASE = 0.1;
/** Planning value: security lost per tenfold of the country's own dead. */
export declare const CASUALTY_WEIGHT = 0.08;
/** Planning value: the most the dead of one war can take off the judgment. */
export declare const CASUALTY_CAP = 0.25;
export declare function rallyFor(conflict: Conflict, turn: number, nation: NationId): number;
/**
 * Whether this government opened the war: the rally it gets is the smaller,
 * shorter one a contested case earns, and none at all for a war opened by a
 * blockade or by force the other side answered. Only the principal who started
 * it; a government that joined someone else's war, or was attacked, is drawn in.
 */
export declare function launchedWar(conflict: Conflict, nation: NationId): boolean;
/** The judgment the dead cost, from the midpoint of the killed band; nothing where no week has been counted. The wounded are not read here. */
export declare function casualtyCost(band: WarLossBand | undefined): number;
export type WarOpinionTerms = {
    readonly rally: number;
    readonly unease: number;
    readonly casualties: number;
    readonly wars: number;
};
/**
 * Every war the country is party to, summed: the strongest rally (a public
 * rallies once, to the newest war), the unease of each front, and each war's
 * dead on its own scale.
 */
export declare function warOpinionTerms(campaign: Campaign): WarOpinionTerms;
/** The war's net push on the security judgment. */
export declare function warSecurityContribution(terms: WarOpinionTerms): number;
/** The sentence the security judgment prints for the war. */
export declare function warSecurityDetail(terms: WarOpinionTerms): string;
