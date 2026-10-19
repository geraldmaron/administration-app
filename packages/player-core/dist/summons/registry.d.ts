import { type Campaign } from "@admin/engine";
import type { Summons, SummonsDue, SummonsDueSpec, SummonsReading, SummonsSpec } from "./types";
export declare function specFor(id: SummonsSpec["id"]): SummonsSpec | undefined;
/** A clock that is currently running, carried with its reading and nothing composed. */
export type DueClock = {
    readonly spec: SummonsDueSpec;
    readonly due: SummonsDue;
};
/**
 * Every clock that currently wants the President, ranked, with no prose written.
 *
 * This is what the attention layer reads. `compose` is not called: a brief
 * reaches the owning room's advisor, and the loop asks all fourteen clocks on
 * every tick of every run. Ranking is on the day rather than the turn, so a
 * report owed in two days outranks one owed in six instead of tying with it.
 */
export declare function dueClocks(campaign: Campaign): readonly DueClock[];
/**
 * Whether a running clock is one the presidency cannot simply carry on past.
 *
 * Only the ones actually due: an interruption-class clock that is merely
 * visible on the calendar — an election eleven months out — is a document until
 * the week it lands. A sheet that opened every week for the same distant date is
 * a sheet the player learns to dismiss without reading.
 */
export declare function stopsTheWeek(clock: DueClock): boolean;
/**
 * The same clocks, composed — for the inbox, the folio and the Record.
 *
 * A spec whose `due` returns nothing has no subject this week — no bill on the
 * desk, no nomination pending — and contributes nothing at all rather than an
 * empty row. `compose` runs only for the clocks that survived that filter, so
 * a quiet week does no work and shows no summons.
 */
export declare function dueSummonses(campaign: Campaign): readonly Summons[];
/**
 * One clock, running or not, as a document.
 *
 * The re-read path: the Record opens any clock by id at any time, and a clock
 * whose subject has gone answers with its own quiet reading instead of a
 * closed door. Returns nothing only for an id no spec claims, which is a bad
 * link rather than a stopped clock.
 */
export declare function summonsReading(campaign: Campaign, id: string): SummonsReading | undefined;
/** Every clock the presidency carries, running first, for the Record's index. */
export declare function allReadings(campaign: Campaign): readonly SummonsReading[];
