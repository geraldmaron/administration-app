import { type StatConsumer } from "./stat-consumers.js";
/** Why each claimed reader does not resolve: a missing file, or no top-level value of that name in it. */
export declare function unresolvedReaders(entries: readonly StatConsumer[], root: string): readonly string[];
