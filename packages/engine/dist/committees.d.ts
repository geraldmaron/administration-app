import type { NationId, PersonId, RoleId } from "@admin/world";
import type { InstitutionId } from "./institutions.js";
import type { Campaign, CommitteeSeat, Congress, PersonRuntime } from "./state.js";
/** The role a chair and a ranking member are both drawn as. */
export declare const COMMITTEE_MEMBER_ROLE = "role-committee-chair";
/**
 * The Senate's own names for the ids the catalog's offices carry.
 *
 * An id with no entry here is a defect in this table rather than a fact about
 * the Senate, and the engine's own test fails on any catalog id this table has
 * not caught up to — so a fourteenth committee cannot appear on a screen as a
 * raw id.
 */
export declare const COMMITTEE_NAMES: Readonly<Record<string, string>>;
/**
 * The committee ids as the catalog itself names them, never a fixed list, so a
 * committee the catalog stops referring an office to drops out of the lattice
 * on its own and one it starts referring to appears without this file changing.
 */
export declare const COMMITTEE_IDS: readonly string[];
export declare function committeeName(committee: string): string;
/**
 * The committee that would take a matter about this body.
 *
 * Read off the catalog's own routing — the committee each office is confirmed
 * by — rather than from a table here, because the Senate that confirms an
 * agency's leadership is the Senate that investigates it, and a second mapping
 * would be a second Congress. A body whose offices name more than one panel is
 * routed to whichever holds most of them, ties broken by id so the answer is
 * the same every week.
 *
 * It lives here rather than beside the inquiry phase that first needed it
 * because it is a fact about the panels, and the module that opens inquiries
 * also reads the executive-order catalog: anything importing this routing from
 * there pulled the whole instrument ladder in behind it, which is a load-order
 * cycle rather than a dependency.
 */
export declare function committeeForInstitution(institution: InstitutionId): string | undefined;
/**
 * The share of a panel that sits with the administration's caucus.
 *
 * Committees are apportioned to the chamber, which is the fact this carries:
 * the majority runs every panel and its margin on each one is the margin it
 * holds in the room. An independent senator holds a panel seat by agreement
 * with the Democrats they caucus with, so they are counted on that side.
 */
export declare function panelBalance(congress: Congress): number;
/**
 * Seat every committee, keeping whoever is already seated where they are.
 *
 * Deterministic and idempotent, on the same rule the Hill's own posts are
 * seated by: the bench is the campaign's own cast sorted by id rather than
 * drawn, the committees are taken in catalog-sorted order, and a member seated
 * by an earlier pass is left alone as long as they are alive. So a founding, a
 * midterm that changes which caucus chairs, and a save brought forward all
 * share one rule rather than three that agree today.
 *
 * A bench with nobody left seats nobody, and that is a supported outcome: an
 * unseated panel reads at the room's own disposition, which is exactly what the
 * committee stage did before any of them had names.
 */
export declare function seatCommittees(congress: Congress, people: Readonly<Record<string, PersonRuntime>>, nation: NationId, turn: number): Readonly<Record<string, CommitteeSeat>>;
/** The same, as the Congress it produces, for callers that hold one. */
export declare function withCommittees(congress: Congress, people: Readonly<Record<string, PersonRuntime>>, nation: NationId, turn: number): Congress;
/** The role a seated committee member holds, for the person record that shows it. */
export declare function committeeSeatRoles(committees: Readonly<Record<string, CommitteeSeat>>): Readonly<Record<string, RoleId>>;
/**
 * How far a panel can carry its own room.
 *
 * Half, which is more than a leadership post is worth and less than the room.
 * A committee is where a nomination is slowed, held or quietly buried, so the
 * panel really is deciding the committee stage; what it is not is a second
 * opinion about the administration, because a chair who despises a president
 * still reports out the uncontroversial half of a cabinet. At a half, a hostile
 * panel under a neutral room costs a nomination weeks rather than the office.
 */
export declare const PANEL_GRAVITY = 0.5;
export type CommitteePanel = {
    readonly committee: string;
    readonly name: string;
    readonly chair: PersonId | undefined;
    readonly ranking: PersonId | undefined;
    readonly balance: number;
    /** The chair's own reading of this administration, where one is seated. */
    readonly chairDisposition: number | undefined;
    readonly rankingDisposition: number | undefined;
    /** What the panel as a whole is disposed to, which is what its stages run on. */
    readonly disposition: number;
};
/**
 * A committee's own reading of this administration.
 *
 * The two members' readings, weighted by the balance of the panel they sit on,
 * pulled a third of the way from the room's. Both halves matter: a chair with a
 * one-seat margin runs a panel that is nearly the room, and one with a wide
 * majority runs a panel that is nearly theirs. With nobody seated this is the
 * room's disposition exactly, which is what keeps a save from before the panels
 * existed confirming at the speed it always did.
 */
export declare function committeePanel(campaign: Campaign, committee: string): CommitteePanel;
/**
 * The disposition a committee's own business is decided against.
 *
 * The one entry point for every caller that used to read `congress.disposition`
 * at a committee stage. An unrouted measure — one whose committee this build
 * does not name — reads the room, which is the honest answer rather than a
 * panel picked for it.
 */
export declare function committeeDisposition(campaign: Campaign, committee: string | undefined): number;
