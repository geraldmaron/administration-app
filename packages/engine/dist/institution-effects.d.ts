import type { Campaign } from "./state.js";
import type { InstitutionId, InstitutionRuntime, InstitutionTick } from "./institutions.js";
import type { Directive } from "./directives.js";
import type { Nomination, NominationId } from "./nomination.js";
import type { NominationStage } from "./nomination-stages.js";
import type { ServiceRuntime } from "./services.js";
import type { ProjectRuntime } from "./projects.js";
export type InstitutionEffect = {
    readonly kind: "institution";
    /** The week's routine drift, one entry per institution that moved. */
    readonly ticks?: readonly InstitutionTick[];
    /** Institutions whose acting authority ran out this week. */
    readonly actingLapsed?: readonly InstitutionId[];
    /**
     * Instructions issued this week, each written whole and keyed by id.
     *
     * Carried on the institution effect rather than on one of its own, because a
     * directive is never a fact about the record alone: the same week it is
     * written the body it was pointed at gains politicization and oversight, and
     * splitting the two across two effects would let a save exist in which the
     * memorandum was filed and nobody was charged for it.
     */
    readonly directives?: readonly Directive[];
    /** A direct change to one institution — its leader, its politicization, its budget. */
    readonly institution?: InstitutionId;
    readonly changes?: Partial<InstitutionRuntime>;
    /**
     * Empty the named institution's top office.
     *
     * Its own field rather than `changes: { leader: undefined }` because an
     * explicit undefined does not survive the JSON round trip a save is: the key
     * has to be deleted, and only a writer can delete it. The same rule
     * `seatCabinetOffice` follows for an emptied cabinet chair.
     */
    readonly vacate?: true;
    /** The week's service records, each written whole and keyed by its id. */
    readonly services?: readonly ServiceRuntime[];
    /** The week's grant programs, each written whole and keyed by its id. */
    readonly projects?: readonly ProjectRuntime[];
};
export type NominationAdvance = {
    readonly id: NominationId;
    readonly stage: NominationStage;
    readonly day: number;
    readonly note: string;
    readonly outcome?: string;
};
export type NominationEffect = {
    readonly kind: "nomination";
    /** A nomination opening, recorded whole. */
    readonly nomination?: Nomination;
    /** An existing nomination moving to its next stage. */
    readonly advance?: NominationAdvance;
};
export declare function applyInstitution(state: Campaign, effect: InstitutionEffect): Campaign;
export declare function applyNomination(state: Campaign, effect: NominationEffect): Campaign;
