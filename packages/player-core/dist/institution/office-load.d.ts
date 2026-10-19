import type { InstitutionRuntime } from "@admin/engine";
import { type Stance } from "../reading.js";
/**
 * The one-glance load reading a body can carry on an office file or organogram
 * row: what is most salient right now, with the figure and the line kept in one
 * grammar everywhere it is shown.
 */
export type LoadNode = {
    readonly figure: string;
    readonly detail: string;
    readonly stance: Stance;
    /** How full the pressure is, 0 to 1, from the same facts as the figure. */
    readonly share: number;
};
/**
 * What is pressing on this body today.
 *
 * A vacancy owns the reading while the chair is open. After that, a backlog
 * bigger than a normal room can ignore owns it. Only when neither is true does
 * the delivery band itself speak first.
 */
export declare function bodyLoad(runtime: InstitutionRuntime): LoadNode;
