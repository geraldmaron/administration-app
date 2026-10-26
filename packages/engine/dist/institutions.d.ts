import { type PersonId, type RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { DirectiveId } from "./directives.js";
import type { TurnPhase } from "./turn-loop.js";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import type { AdministrationParty } from "./state-legislature.js";
export { INSTITUTION_CATALOG };
export type InstitutionId = string;
export type OfficeId = string;
export type InstitutionKind = "presidency" | "legislature" | "judiciary" | "state-government" | "department" | "executive-office" | "independent-agency" | "regulator" | "intelligence" | "military" | "operating-component" | "field";
/**
 * How far a body sits from presidential direction, which is the single most
 * consequential fact about it and the one a seven-seat cabinet could not
 * express at all.
 *
 * `executive` takes direction. `semi-autonomous` takes direction but has norms
 * or a statutory mission that make politicizing it cost something. `independent`
 * does not take direction on its core function at all: the President's only
 * lever is the seat that opens, which is what makes a long-dated appointment
 * a real decision rather than a flavor line.
 */
export type InstitutionIndependence = "executive" | "semi-autonomous" | "independent";
/** How a leadership office is filled. Drives which confirmation path applies. */
export type AppointmentClass = "PAS" | "PA" | "SES" | "ScheduleC" | "fixed-term" | "judicial" | "military";
/**
 * What may happen when the office is empty.
 *
 * Deliberately per-office. Assuming one global Vacancies Act rule for every
 * seat is wrong in both directions: some offices have their own statutory
 * succession that overrides it, and a multi-member board does not get an
 * acting member at all, it operates on whatever quorum it still has.
 */
export type ActingAuthority = "vacancies-act" | "statutory-succession" | "board-quorum" | "none";
export type RemovalConstraint = "at-will" | "for-cause" | "term-protected";
export type OfficeDef = {
    readonly id: OfficeId;
    readonly title: string;
    readonly appointmentClass: AppointmentClass;
    readonly confirmingChamber?: "senate";
    /** The House votes on the nominee too: the Vice President under the Twenty-fifth Amendment, section 2. */
    readonly confirmedByBothHouses?: true;
    readonly committee?: string;
    /** Fixed statutory term, where the office has one. Absent means serves at pleasure. */
    readonly termYears?: number;
    /** Multi-member bodies: how many seats the office describes. Absent means one. */
    readonly seats?: number;
    readonly actingAuthority: ActingAuthority;
    /** How long an acting officer may serve before the authority lapses. */
    readonly actingLimitDays?: number;
    readonly removal: RemovalConstraint;
    /**
     * A for-cause office whose protection no holding has struck but the
     * reasoning of Trump v. Slaughter reaches: the President may remove without
     * a stated cause, and each removal is a legal exposure (legal-exposure.ts).
     */
    readonly removalContested?: true;
    /** Order in the presidential line of succession, where the office is in it. */
    readonly successionRank?: number;
    readonly cabinetRank?: number;
};
export type InstitutionDef = {
    readonly id: InstitutionId;
    readonly name: string;
    readonly abbr: string;
    readonly kind: InstitutionKind;
    readonly tier: 0 | 1 | 2 | 3;
    readonly parent?: InstitutionId;
    readonly mandate: string;
    readonly jurisdictions: readonly string[];
    readonly authorities: readonly string[];
    readonly independence: InstitutionIndependence;
    readonly offices: readonly OfficeDef[];
    readonly capabilities: readonly string[];
    readonly domains: readonly string[];
    readonly locales?: readonly string[];
    /** Capacity at inauguration, 0..1: how much of its mandate it can carry. */
    readonly foundingCapacity: number;
    /** Relative size, 0..1. Scales how much work arrives and how fast backlog builds. */
    readonly staffScale: number;
    /**
     * The cabinet seat that runs this body, where one does.
     *
     * The join that was missing, and the whole of a defect the player could see:
     * the roster read "Secretary of State — Hannah Palmer" while the executive
     * branch on the same screen read "Department of State — No confirmed
     * officer", because `player.cabinet` is keyed by charter role and
     * `campaign.institutions` by institution id and nothing connected them. One
     * office was two records, and they disagreed.
     *
     * With this, the cabinet seat is the fact and the institution's `leader` is
     * projected from it by the one writer that seats a minister
     * (`seatCabinetOffice`). A body with no `cabinetRole` — an independent
     * regulator, a component bureau — keeps its own leader and its own
     * confirmation, which is correct: nobody sits in the cabinet for the FCC.
     */
    readonly cabinetRole?: RoleId;
};
/**
 * The live state of one institution. Everything here is 0..1 except backlog,
 * which is an unbounded count of work owed, because the whole point of a
 * backlog is that it has no ceiling and a capacity reading does.
 */
export type InstitutionRuntime = {
    readonly id: InstitutionId;
    /** The confirmed officeholder, where there is one. */
    readonly leader?: PersonId;
    /** The occupant's appointment record. Founding entries are explicitly synthetic. */
    readonly judicialProvenance?: {
        readonly serviceStartYear: number;
        readonly appointingParty: AdministrationParty;
        readonly synthetic?: true;
    };
    /** Last annual vacancy draw for this occupant; stored so replay and save/reload cannot redraw it. */
    readonly judicialAssessmentYear?: number;
    /** An anonymous circuit incumbent is occupied even before a panel gives them a fictional identity. */
    readonly lowerBenchSeat?: {
        readonly circuit: string;
        readonly sourceDate: string;
        readonly appointingParty?: AdministrationParty;
        readonly modeledAgeAtFounding?: number;
        readonly modeledServiceYearsAtFounding?: number;
    };
    /** Serving under acting authority, which is not the same as holding the office. */
    readonly actingLeader?: PersonId;
    /** The date the acting authority lapses, as an ordinal day of the campaign. */
    readonly actingExpiresDay?: number;
    readonly vacancy: boolean;
    /** How long the top office has been empty, in days. Drives the cost of leaving it empty. */
    readonly vacantDays: number;
    readonly capacity: number;
    readonly staffing: number;
    readonly morale: number;
    readonly integrity: number;
    /** How far the body has been bent toward the administration's politics rather than its mandate. */
    readonly politicization: number;
    readonly budgetAdequacy: number;
    readonly backlog: number;
    /**
     * The instructions this administration has given it, by id.
     *
     * Ids rather than sentences. It held free text until the directive layer
     * landed, which meant an instruction had no status, no date, no author and no
     * way to have been refused — so nothing could read it and nothing did. The
     * record itself lives in `campaign.directives`; what sits here is the join.
     */
    readonly directives: readonly DirectiveId[];
    /** What actually comes out, 0..1. Derived each turn, never written directly. */
    readonly implementationQuality: number;
    readonly oversightPressure: number;
    /** Removals from an office whose protection is contested, each the origin of one legal exposure. */
    readonly contestedRemovals?: readonly ContestedRemoval[];
};
export type ContestedRemoval = {
    readonly person: PersonId;
    readonly turn: number;
    readonly cause?: string;
};
/**
 * An institution's name as it reads inside a sentence.
 *
 * Every body in the catalog takes the article in running prose (the Department
 * of Justice, the Federal Bureau of Investigation), and a sentence that
 * interpolated the bare name read like a telegram: "directing casework at
 * Federal Bureau of Investigation". A name that already opens with "The" keeps
 * its own article, lowered to sit mid-sentence.
 */
export declare function institutionInProse(name: string): string;
/** The same name opening a sentence. */
export declare function institutionOpening(name: string): string;
export declare function institutionDef(id: InstitutionId): InstitutionDef | undefined;
export declare function officeDef(id: OfficeId): OfficeDef | undefined;
export declare function officeInstitution(id: OfficeId): InstitutionDef | undefined;
export declare const INSTITUTION_IDS: readonly InstitutionId[];
export declare const OFFICE_IDS: readonly OfficeId[];
/** Direct children of an institution in the graph. */
export declare function institutionChildren(id: InstitutionId): readonly InstitutionDef[];
/** Every institution holding a named authority, which is how a policy finds its executor. */
export declare function institutionsWithAuthority(authority: string): readonly InstitutionDef[];
export declare function institutionsForDomain(domain: string): readonly InstitutionDef[];
/**
 * Every institution at inauguration.
 *
 * A new administration inherits a government that is already running: staffed,
 * with its own morale and its own backlog, and with the political offices empty
 * because the previous administration's appointees left with it. That asymmetry
 * — career staff present, political leadership absent — is the actual opening
 * position of an American presidency and it is what makes the first months of
 * a term about appointments whether the player wants them to be or not.
 */
export declare function foundingInstitutions(cabinet?: Readonly<Record<string, PersonId>>): Readonly<Record<InstitutionId, InstitutionRuntime>>;
/** How much of the top office's absence is actually biting, 0..1. */
export declare function vacancyDrag(runtime: InstitutionRuntime): number;
/**
 * How much the head of a body below the cabinet adds to or takes from what it
 * delivers, signed. Zero for a department, whose Secretary other rules read,
 * and zero where nobody is in the chair, which the vacancy drag already prices.
 */
export declare function leaderDeliveryTerm(def: InstitutionDef, leaderCompetence: number | undefined): number;
/** The competence of whoever is running this body, confirmed or acting, where anyone is. */
export declare function leaderCompetenceOf(campaign: Pick<Campaign, "people">, runtime: InstitutionRuntime): number | undefined;
/**
 * What an institution actually delivers, as against what it was asked for.
 *
 * Deliberately a derivation rather than a stored dial: every term in it is a
 * fact the player can see and move, so when delivery degrades there is always
 * an answer to "why", which is the difference between endogenous fragility and
 * a hidden difficulty multiplier.
 */
export declare function deriveImplementationQuality(runtime: InstitutionRuntime, def: InstitutionDef, leaderCompetence?: number): number;
/**
 * The terms delivery is the sum of, unrounded: four inputs and the head's
 * signed contribution that add up to what the body could deliver, and three
 * drags, already scaled by its insulation, that come off it. A screen that
 * explains a delivery figure reads these rather than restating the weights,
 * so the explanation cannot drift from the figure it explains.
 */
export type ImplementationTerms = {
    readonly staffing: number;
    readonly morale: number;
    readonly budget: number;
    readonly capacity: number;
    readonly leader: number;
    readonly vacancy: number;
    readonly politicization: number;
    readonly backlog: number;
};
export declare function implementationTerms(runtime: InstitutionRuntime, def: InstitutionDef, leaderCompetence?: number): ImplementationTerms;
/**
 * The executive branch's aggregate ability to carry out what it is told to do.
 *
 * Weighted by staff scale rather than by headcount of institutions, because a
 * vacancy at the Department of Defense and a vacancy at a five-person board
 * are not the same fact and averaging them flat would say they were.
 */
export declare function selectExecutiveCapacity(campaign: Campaign): number;
/**
 * How much of the executive branch's delivery is being lost to offices nobody
 * is in, 0..1.
 *
 * Measured on the vacancy drag alone, weighted the way capacity is, and not on
 * capacity itself — which is the distinction that makes this a fair reading
 * rather than a permanent tax. Capacity also carries morale and backlog, and a
 * branch that has been hollow for two years keeps a lowered morale and a
 * standing backlog long after its offices are filled; charging the president
 * for those forever would mean no administration could ever recover from a bad
 * start. What a president controls, and what this reads, is whether anybody is
 * in the chair.
 *
 * Zero for a fully led branch, which is the point: this can only ever mark an
 * administration down, and only for the part of the government it has actually
 * left empty.
 */
export declare function selectDeliveryShortfall(campaign: Campaign): number;
/** Every institution whose top office is empty, worst first. */
export declare function selectVacancies(campaign: Campaign): readonly InstitutionRuntime[];
/** What a body clears against what arrives at full delivery; the services keep the same crossing point. */
export declare const CLEARANCE_PER_ARRIVAL: number;
export type InstitutionTick = {
    readonly id: InstitutionId;
    readonly changes: Partial<InstitutionRuntime>;
};
/**
 * One turn of institutional life, as a list of changes rather than as writes.
 *
 * Split out from the phase so the balance harness and the tests can read what
 * a turn would do to an institution without going through apply().
 */
export declare function institutionTick(runtime: InstitutionRuntime, def: InstitutionDef, daysElapsed: number, lapsed?: boolean, settled?: number, leaderCompetence?: number): InstitutionTick;
/**
 * The executive branch's own week: backlogs move, morale drifts, vacancies get
 * more expensive, and acting authority runs out.
 *
 * Emitted as one packet rather than one per institution, because fifty-odd
 * ledger entries a week for routine administrative drift would bury the record
 * the player actually reads.
 */
export declare const institutionPhase: TurnPhase;
/**
 * Every institution a cabinet seat runs, keyed by that seat.
 *
 * Built once off the catalog rather than searched per call: the roster reads
 * it on every render and the seating writer on every appointment.
 */
export declare const INSTITUTION_BY_CABINET_ROLE: ReadonlyMap<string, InstitutionDef>;
/** The body this cabinet seat runs, where it runs one. */
export declare function institutionForRole(role: RoleId): InstitutionDef | undefined;
/**
 * The role on the record of whoever leads this body: its cabinet seat for a
 * department, a seat on the bench for a court, the Vice President's for the
 * vice presidency, and the agency head's for every other body. These are the
 * roles the founding seats each kind under, so an officer the Senate confirms
 * reads the same as one the transition inherited.
 */
export declare function leaderRoleOf(def: InstitutionDef): RoleId;
/**
 * Seat a person in a cabinet office, in every record at once.
 *
 * **The one writer.** Before this, seating a Secretary of State wrote
 * `player.cabinet` and left `INST-STATE` vacant forever, so the Government
 * room showed a named Secretary of State above a Department of State with "no
 * confirmed officer" — one office, two records, disagreeing on screen. The
 * person is the third record: a Secretary seated without their `currentRole`
 * was offered for every other job in the government, and a Secretary displaced
 * without losing it could never be appointed again. Every path that seats or
 * empties a cabinet chair goes through here, which is what makes the three
 * unable to drift apart rather than merely agreeing today.
 *
 * `person` omitted empties the chair. The institution's `vacantDays` resets on
 * a seating and starts counting again from an emptying, because that clock is
 * what the delivery reading is actually about: how long nobody has been in it.
 */
export declare function seatCabinetOffice(state: Campaign, role: RoleId, person: PersonId | undefined): Campaign;
/**
 * The acting record with these seats cleared. Deleted rather than set to
 * undefined, for the JSON round trip a save is, and left untouched when none
 * of them is held so a campaign with no actings keeps the shape it had.
 */
export declare function withoutActing(state: Campaign, seats: readonly string[]): Campaign;
/**
 * Seat a confirmed officer at the head of a body, whatever kind of body it is.
 *
 * A department's chair is its cabinet seat, so it goes through
 * `seatCabinetOffice`; any other body is led directly. Either way the person
 * takes the body's leader role and whoever led it before gives it up, and the
 * acting authority ends, because a confirmed officer is what acting authority
 * stood in for.
 */
export declare function seatOfficer(state: Campaign, institution: InstitutionId, person: PersonId): Campaign;
/** Whether an office is the one its body's leader holds; a deputy's is not. */
export declare function leadsInstitution(office: OfficeId): boolean;
