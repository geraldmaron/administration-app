/**
 * Every destination in the player's route tree, and the one place its href is
 * built.
 *
 * Platform-neutral: hrefs are pathname strings, with a query only where the
 * design detaches a second level inside a screen (a district inside its state,
 * a judge on the bench). A surface that needs a url asks here; no module spells
 * a pathname by hand, so the tree can move without a hunt for string literals.
 */
/** The five modes, each with a home camera. */
export type Mode = "brief" | "washington" | "nation" | "world" | "record";
/** A destination that needs no id: a mode root, a mode's fixed screen, or a screen outside the modes. */
export type PlaceKey = "title" | "brief" | "digest" | "washington" | "pressOffice" | "congress" | "courts" | "oversight" | "nation" | "economy" | "budget" | "policy" | "emergency" | "world" | "security" | "record" | "press" | "founding" | "administrations" | "settings" | "handbook" | "recovery" | "ending" | "legacy";
export type PlaceName = {
    readonly href: string;
    readonly title: string;
    /** How a sentence refers to the place: "Opens the Budget." */
    readonly reference: string;
    /** An icon name from the ui-web set. */
    readonly icon: string;
    /** The mode a screen belongs to; absent outside the modes. */
    readonly mode?: Mode;
};
export declare const PLACES: Readonly<Record<PlaceKey, PlaceName>>;
/**
 * A destination opened on the component that shows the matter: the id of that
 * component's section, after any query. The page owns the id; a gate checks each
 * one named here is drawn.
 */
export declare function anchored(href: string, anchor: string): string;
export declare const place: {
    readonly title: () => string;
    readonly brief: () => string;
    readonly digest: () => string;
    readonly decision: (id: string) => string;
    readonly clock: (id: string) => string;
    readonly scandal: (id: string) => string;
    readonly metric: (id: string) => string;
    /** Where approval is built and read, which the removal clock and every election count. */
    readonly approval: () => string;
    readonly washington: () => string;
    readonly office: (id: string) => string;
    /** An office opened on one of its views ("leadership", "organization", "actions", "record"). */
    readonly officeView: (id: string, view: string) => string;
    readonly pressOffice: () => string;
    readonly person: (id: string) => string;
    readonly congress: () => string;
    readonly bill: (id: string) => string;
    readonly post: (id: string) => string;
    readonly courts: () => string;
    readonly case: (id: string) => string;
    readonly oversight: () => string;
    /** The appointments desk, opened on one seat where one is named. */
    readonly appointments: (seat?: string) => string;
    readonly nation: () => string;
    /** The Nation screen opened on one of its views ("opinion", "groups", "states"). */
    readonly nationView: (view: string) => string;
    readonly state: (id: string) => string;
    /** A state file opened on one of its views ("conditions", "response", "representation"). */
    readonly stateView: (id: string, view: string) => string;
    /** A state's act desk, the same shape as a country's: answering one matter (`cause`), or sending federal power where nothing is there to answer. */
    readonly stateAct: (id: string, cause?: string) => string;
    readonly district: (id: string) => string;
    readonly economy: () => string;
    /** The economy opened on one of its views ("markets", "trade", "finances", "levers"). */
    readonly economyView: (view: string) => string;
    /** The economy opened on the view that carries one measure, with that measure selected; the overview needs no view. */
    readonly economyMeasure: (measure: string, view: string) => string;
    readonly electorate: () => string;
    readonly budget: () => string;
    /** The budget opened on one of its views ("authority", "books"). */
    readonly budgetView: (view: string) => string;
    readonly policy: () => string;
    /** The policy portfolio opened on one domain. */
    readonly policyDomain: (domain: string) => string;
    readonly order: (id: string) => string;
    readonly emergency: () => string;
    /** The emergency board with one condition or incident selected, so its response is open. */
    readonly emergencyIncident: (id: string) => string;
    /** The emergency board with one declaration selected, so its continuation is in reach. */
    readonly emergencyDeclaration: (id: string) => string;
    readonly world: () => string;
    readonly country: (id: string) => string;
    readonly countryAct: (id: string) => string;
    readonly organization: (id: string) => string;
    readonly war: (id: string) => string;
    readonly treaty: (id: string) => string;
    readonly security: () => string;
    /** National security opened on one service's readiness. */
    readonly service: (id: string) => string;
    readonly command: (id: string) => string;
    readonly record: () => string;
    /** The Record opened on one of its views ("promises", "arcs", "standing", "assessments"). */
    readonly recordView: (view: string) => string;
    readonly event: (id: string) => string;
    readonly press: () => string;
    /** The Press screen opened on one of its views ("feed", "desks", "respond", "abroad"). */
    readonly pressView: (view: string) => string;
    readonly dispatch: (id: string) => string;
    readonly founding: () => string;
    readonly administrations: () => string;
    readonly settings: () => string;
    readonly recovery: () => string;
    readonly ending: () => string;
    readonly legacy: () => string;
};
