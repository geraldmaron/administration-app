import { CARGO_BUCKETS, CHOKEPOINT_CARGO, type NationId } from "@admin/world";
import { blockadesInForce, type Blockade } from "./blockades.js";
import { sideOf } from "./conflicts.js";
import { disposition } from "./relationships.js";
import { selectActiveConflicts, selectNation, selectRelationship, type Campaign, type Conflict } from "./state.js";

// Passage through a strait a war has closed, decided flag by flag.
//
// A government that closes a strait does not have to stop every ship: it can
// let through cargo bound for itself, for its allies and for governments it
// reads warmly, and stop the rest. So what a closure takes off the market is
// the share of the strait's cargo bound for flags the closing government will
// not pass, and those are the countries that lose the supply. The cargo split
// comes from the world's table (`CHOKEPOINT_CARGO`); a strait with no split
// on file is closed to every flag alike, and so is cargo the source files only
// under a region, because no denier can tell those ships apart.

/**
 * Planning value: how warmly a closing government has to read a flag's
 * government (`disposition`, -1..1) to let its ships through when the two are
 * not aligned. Set above neutral, so passage is a favor rather than a default.
 */
export const PASSAGE_DISPOSITION = 0.3;

export type StraitPassage = {
  readonly chokepoint: string;
  /** The governments on the strait's shores fighting in the war that closed it. */
  readonly deniers: readonly NationId[];
  /** Governments off the shore blockading one on it, whose navies stop only that government's cargo and their enemies'. */
  readonly blockaders: readonly NationId[];
  /** Named flags let through. */
  readonly passing: readonly NationId[];
  /** Named flags and unsplit cargo stopped. */
  readonly stopped: readonly string[];
  /** 0..1 of the strait's flow stopped. */
  readonly stoppedShare: number;
};

function aligned(campaign: Campaign, a: NationId, b: NationId): boolean {
  const pulls = (from: NationId, to: NationId) => selectNation(campaign, from)?.base.doctrine.alignmentPull.some((id) => id === to) ?? false;
  return pulls(a, b) || pulls(b, a);
}

/**
 * Whether the closing government lets this flag's ships through: its own and
 * its co-belligerents' always, its enemies' in this war never, otherwise an
 * aligned government's or one it reads warmly.
 */
export function letsThrough(campaign: Campaign, conflict: Conflict, denier: NationId, flag: NationId): boolean {
  if (flag === denier) return true;
  const flagSide = sideOf(conflict, flag);
  if (flagSide !== undefined) return flagSide === sideOf(conflict, denier);
  if (aligned(campaign, denier, flag)) return true;
  const relationship = selectRelationship(campaign, denier, flag);
  return relationship !== undefined && disposition(relationship, campaign) >= PASSAGE_DISPOSITION;
}

/** Whether two governments are on opposite sides of any war now being fought. */
function atWarWith(campaign: Campaign, a: NationId, b: NationId): boolean {
  return selectActiveConflicts(campaign).some((conflict) => {
    const sa = sideOf(conflict, a);
    const sb = sideOf(conflict, b);
    return sa !== undefined && sb !== undefined && sa !== sb;
  });
}

/**
 * Whether a navy blockading a government on the strait's shores, from off the
 * shore, lets a cargo through. It stops cargo bound for the government it
 * blockades and for governments it is at war with, and no one else's: a navy
 * that does not hold the shore cannot close the strait as a whole.
 */
export function blockaderLetsThrough(campaign: Campaign, blockade: Pick<Blockade, "imposer" | "target">, destination: NationId): boolean {
  if (destination === blockade.target) return false;
  return destination === blockade.imposer || !atWarWith(campaign, blockade.imposer, destination);
}

/** The blockades standing against governments on the strait's shores, held from off the shore and within reach (`blockadesInForce`). */
function offshoreBlockades(campaign: Campaign, littoral: readonly NationId[]): readonly Blockade[] {
  return blockadesInForce(campaign).filter((blockade) => littoral.includes(blockade.target) && !littoral.includes(blockade.imposer));
}

/** Who passes a strait this war closes, for one commodity's cargo. */
export function straitPassage(
  campaign: Campaign,
  conflict: Conflict,
  chokepoint: string,
  commodity: string,
  littoral: readonly NationId[],
): StraitPassage {
  const deniers = littoral.filter((shore) => sideOf(conflict, shore) !== undefined);
  const navies = offshoreBlockades(campaign, littoral);
  const blockaders = [...new Set(navies.map((blockade) => blockade.imposer))];
  const rows = CHOKEPOINT_CARGO.filter((row) => row.chokepoint === chokepoint && row.commodity === commodity);
  if (rows.length === 0) return { chokepoint, deniers, blockaders, passing: [], stopped: [], stoppedShare: 1 };
  const passes = (destination: string) =>
    !CARGO_BUCKETS.includes(destination)
    && deniers.every((denier) => letsThrough(campaign, conflict, denier, destination as NationId))
    && navies.every((blockade) => blockaderLetsThrough(campaign, blockade, destination as NationId));
  const total = rows.reduce((sum, row) => sum + row.mbd, 0);
  const stoppedRows = rows.filter((row) => !passes(row.destination));
  return {
    chokepoint,
    deniers,
    blockaders,
    passing: rows.filter((row) => passes(row.destination)).map((row) => row.destination as NationId),
    stopped: stoppedRows.map((row) => row.destination),
    stoppedShare: total > 0 ? stoppedRows.reduce((sum, row) => sum + row.mbd, 0) / total : 1,
  };
}
