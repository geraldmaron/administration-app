import { COMMODITY_IDS } from "@admin/engine";

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
export type PlaceKey =
  | "title"
  | "brief"
  | "digest"
  | "washington"
  | "pressOffice"
  | "congress"
  | "courts"
  | "oversight"
  | "nation"
  | "economy"
  | "budget"
  | "policy"
  | "emergency"
  | "world"
  | "security"
  | "record"
  | "press"
  | "founding"
  | "administrations"
  | "settings"
  | "handbook"
  | "recovery"
  | "ending"
  | "legacy";

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

export const PLACES: Readonly<Record<PlaceKey, PlaceName>> = {
  title: { href: "/", title: "Title", reference: "the title screen", icon: "subjectSeal" },
  brief: { href: "/brief", title: "Brief", reference: "the Brief", icon: "brief", mode: "brief" },
  digest: { href: "/brief/digest", title: "Briefing history", reference: "Briefing history", icon: "notificationStack", mode: "brief" },
  washington: { href: "/washington", title: "Washington", reference: "Washington", icon: "westWing", mode: "washington" },
  pressOffice: { href: "/washington/office/press", title: "Press", reference: "the Press screen", icon: "press", mode: "washington" },
  congress: { href: "/washington/congress", title: "Congress", reference: "Congress", icon: "subjectChamber", mode: "washington" },
  courts: { href: "/washington/courts", title: "Courts", reference: "Courts", icon: "court", mode: "washington" },
  oversight: { href: "/washington/oversight", title: "Oversight", reference: "Oversight", icon: "review", mode: "washington" },
  nation: { href: "/nation", title: "Nation", reference: "the Nation screen", icon: "flag", mode: "nation" },
  economy: { href: "/nation/economy", title: "Economy", reference: "the Economy screen", icon: "economyGrowth", mode: "nation" },
  budget: { href: "/nation/budget", title: "Budget", reference: "the Budget", icon: "budget", mode: "nation" },
  policy: { href: "/nation/policy", title: "Policy", reference: "Policy", icon: "domesticLedger", mode: "nation" },
  emergency: { href: "/nation/emergency", title: "Emergency", reference: "the Emergency screen", icon: "caution", mode: "nation" },
  world: { href: "/world", title: "World", reference: "the World screen", icon: "world", mode: "world" },
  security: { href: "/world/security", title: "Security", reference: "Security", icon: "shield", mode: "world" },
  record: { href: "/record", title: "Record", reference: "the Record", icon: "record", mode: "record" },
  /** The old Record address, which redirects to the press page; kept only while the navigation still lists it. */
  press: { href: "/record/press", title: "Coverage", reference: "press coverage", icon: "press", mode: "record" },
  founding: { href: "/founding", title: "Founding", reference: "the Founding screen", icon: "sign" },
  administrations: { href: "/administrations", title: "Administrations", reference: "your administrations", icon: "archive" },
  handbook: { href: "/handbook", title: "Handbook", reference: "the Handbook", icon: "info" },
  settings: { href: "/settings", title: "Settings", reference: "Settings", icon: "utilitySettings" },
  recovery: { href: "/recovery", title: "Recovery", reference: "Recovery", icon: "return" },
  ending: { href: "/ending", title: "Ending", reference: "the Ending screen", icon: "ballot" },
  legacy: { href: "/legacy", title: "Legacy", reference: "your Legacy", icon: "dossier" },
};

const seg = (id: string): string => encodeURIComponent(id);

function at(key: PlaceKey): string {
  return PLACES[key].href;
}

function withParam(pathname: string, key: string, value: string): string {
  return `${pathname}?${new URLSearchParams({ [key]: value }).toString()}`;
}

/**
 * A district's id carries its state as the prefix ("CA-12", "WY-AL"), which is
 * how the dataset names all 435; reading it back here lets a district door be
 * built from the district alone, the way every other subject is.
 */
function districtState(districtId: string): string {
  return districtId.split("-")[0] ?? districtId;
}

const ECONOMY_RATES: ReadonlySet<string> = new Set(["inflation", "unemployment", "growth"]);
const ECONOMY_MARKETS: ReadonlySet<string> = new Set(["policy-rate", ...COMMODITY_IDS]);

/**
 * The screen that owns a reading, opened on it: the budget for the authority,
 * the emergency board for order at home, the economy for a rate or a price.
 * Readings with no owner yet keep their own page.
 */
function metricHome(id: string): string | undefined {
  if (id === "treasury") return withParam(at("budget"), "view", "authority");
  if (id === "stability") return at("emergency");
  if (id === "militaryReadiness") return at("security");
  if (id === "standing") return at("world");
  if (ECONOMY_RATES.has(id)) return `${at("economy")}?${new URLSearchParams({ measure: id }).toString()}`;
  if (ECONOMY_MARKETS.has(id)) return `${at("economy")}?${new URLSearchParams({ view: "markets", measure: id }).toString()}`;
  return undefined;
}

/**
 * A destination opened on the component that shows the matter: the id of that
 * component's section, after any query. The page owns the id; a gate checks each
 * one named here is drawn.
 */
export function anchored(href: string, anchor: string): string {
  return `${href}#${anchor}`;
}

export const place = {
  title: (): string => at("title"),

  brief: (): string => at("brief"),
  digest: (): string => at("digest"),
  decision: (id: string): string => `/brief/decision/${seg(id)}`,
  clock: (id: string): string => `/brief/clock/${seg(id)}`,
  scandal: (id: string): string => `/brief/scandal/${seg(id)}`,
  // Approval has no page of its own: the Nation screen is where it is built and read.
  // Approval is read on the opinion view of the country screen; naming the view makes a link to it a link to the reading, not the mode.
  metric: (id: string): string => (id === "approval" ? `${at("nation")}?view=opinion` : (metricHome(id) ?? `/brief/metric/${seg(id)}`)),

  /** Where approval is built and read, which the removal clock and every election count. */
  approval: (): string => anchored(place.metric("approval"), "elec-topline"),

  washington: (): string => at("washington"),
  office: (id: string): string => `/washington/office/${seg(id)}`,
  /** An office opened on one of its views ("leadership", "organization", "actions", "record"). */
  officeView: (id: string, view: string): string => withParam(`/washington/office/${seg(id)}`, "view", view),
  pressOffice: (): string => at("pressOffice"),
  person: (id: string): string => `/washington/person/${seg(id)}`,
  congress: (): string => at("congress"),
  bill: (id: string): string => `/washington/congress/bill/${seg(id)}`,
  post: (id: string): string => `/washington/congress/post/${seg(id)}`,
  courts: (): string => at("courts"),
  case: (id: string): string => `/washington/courts/case/${seg(id)}`,
  oversight: (): string => at("oversight"),
  /** The appointments desk, opened on one seat where one is named. */
  appointments: (seat?: string): string =>
    `${at("oversight")}?${new URLSearchParams({ view: "appointments", ...(seat ? { seat } : {}) }).toString()}`,

  nation: (): string => at("nation"),
  /** The Nation screen opened on one of its views ("opinion", "groups", "states"). */
  nationView: (view: string): string => withParam(at("nation"), "view", view),
  state: (id: string): string => `/nation/state/${seg(id)}`,
  /** A state file opened on one of its views ("conditions", "response", "representation"). */
  stateView: (id: string, view: string): string => withParam(`/nation/state/${seg(id)}`, "view", view),
  /** A state's act desk, the same shape as a country's: answering one matter (`cause`), or sending federal power where nothing is there to answer. */
  stateAct: (id: string, cause?: string): string => (cause ? withParam(`/nation/state/${seg(id)}/act`, "cause", cause) : withParam(`/nation/state/${seg(id)}/act`, "power", "1")),
  district: (id: string): string => withParam(`/nation/state/${seg(districtState(id))}`, "district", id),
  economy: (): string => at("economy"),
  /** The economy opened on one of its views ("markets", "trade", "finances", "levers"). */
  economyView: (view: string): string => withParam(at("economy"), "view", view),
  /** The economy opened on the view that carries one measure, with that measure selected; the overview needs no view. */
  economyMeasure: (measure: string, view: string): string =>
    `${at("economy")}?${new URLSearchParams(view === "overview" ? { measure } : { view, measure }).toString()}`,
  electorate: (): string => at("nation"),
  budget: (): string => at("budget"),
  /** The budget opened on one of its views ("authority", "books"). */
  budgetView: (view: string): string => withParam(at("budget"), "view", view),
  policy: (): string => at("policy"),
  /** The policy portfolio opened on one domain. */
  policyDomain: (domain: string): string => withParam(at("policy"), "domain", domain),
  order: (id: string): string => `/nation/policy/order/${seg(id)}`,
  emergency: (): string => at("emergency"),
  /** The emergency board with one condition or incident selected, so its response is open. */
  emergencyIncident: (id: string): string => withParam(at("emergency"), "incident", id),
  /** The emergency board with one declaration selected, so its continuation is in reach. */
  emergencyDeclaration: (id: string): string => withParam(at("emergency"), "declaration", id),

  world: (): string => at("world"),
  country: (id: string): string => `/world/nation/${seg(id)}`,
  countryAct: (id: string): string => `/world/nation/${seg(id)}/act`,
  organization: (id: string): string => `/world/org/${seg(id)}`,
  war: (id: string): string => `/world/war/${seg(id)}`,
  treaty: (id: string): string => `/world/treaty/${seg(id)}`,
  security: (): string => at("security"),
  /** National security opened on one service's readiness. */
  service: (id: string): string => withParam(at("security"), "service", id),
  command: (id: string): string => `/world/security/command/${seg(id)}`,

  record: (): string => at("record"),
  /** The Record opened on one of its views ("promises", "arcs", "standing", "assessments"). */
  recordView: (view: string): string => withParam(at("record"), "view", view),
  event: (id: string): string => `/record/event/${seg(id)}`,
  press: (): string => at("pressOffice"),
  /** The Press screen opened on one of its views ("feed", "desks", "respond", "abroad"). */
  pressView: (view: string): string => withParam(at("pressOffice"), "view", view),
  dispatch: (id: string): string => `/record/press/dispatch/${seg(id)}`,

  founding: (): string => at("founding"),
  administrations: (): string => at("administrations"),
  settings: (): string => at("settings"),
  recovery: (): string => at("recovery"),
  ending: (): string => at("ending"),
  legacy: (): string => at("legacy"),
} as const;

