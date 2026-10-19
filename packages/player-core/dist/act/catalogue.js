import { ENGAGEMENT_KINDS, INSTRUMENT_RUNGS, TREATY_TERMS, } from "@admin/engine";
import { subjectHrefWith } from "../shell/subject";
// Everything the President can do to one foreign government, sorted by what
// the President wants from it. The catalogue is read off the engine's own
// tables (the instrument ladder, the engagement kinds, the treaty kinds) so a
// rung, a kind of meeting or a kind of treaty the engine gains lands under a
// goal without anyone listing it here. Only the rule that sorts them is
// authored, and it is a rule about instruments, not a list of options.
export const ACT_GOALS = ["ties", "trade", "pressure", "covert", "force"];
export const ACT_GOAL_COPY = {
    ties: { name: "Build ties", question: "Bring them closer", line: "Calls, visits, treaties and aid" },
    trade: { name: "Trade", question: "Change what we trade", line: "Tariffs and trade warnings" },
    pressure: { name: "Pressure", question: "Make them change course", line: "Diplomatic steps and sanctions" },
    covert: { name: "Covert", question: "Act in secret", line: "Intelligence operations" },
    force: { name: "Force", question: "Use the military", line: "From training exercises to invasion, and asking Congress" },
};
export const ACT_FAMILY_NAMES = {
    meet: "Meet them",
    sign: "Put it in writing",
    assist: "Help them",
    tariff: "Tax their goods",
    diplomatic: "Diplomatic pressure",
    justice: "Justice Department",
    economic: "Economic measures",
    covert: "Covert action",
    military: "Military force",
    congress: "Ask Congress first",
};
const ENGAGEMENT_NAMES = {
    call: "Phone call",
    envoy: "Send an envoy",
    visit: "State visit",
    summit: "Summit",
    declaration: "Joint declaration",
};
// Above its second rung the economic ladder stops being a trade measure and
// becomes a sanction: designations, frozen assets and an embargo are made to
// change a government's course, which is what a player reaching for pressure
// is looking for. The first two rungs (a warning to business, a general
// tariff increase) are trade policy.
const TRADE_RUNG_CEILING = 2;
const INSTRUMENT_GOAL = {
    diplomatic: () => "pressure",
    economic: (rung) => (rung <= TRADE_RUNG_CEILING ? "trade" : "pressure"),
    covert: () => "covert",
    military: () => "force",
    assistance: () => "ties",
};
const INSTRUMENT_FAMILY = {
    diplomatic: "diplomatic",
    economic: "economic",
    covert: "covert",
    military: "military",
    assistance: "assist",
};
/** Which goal an instrument rung serves. */
export function goalOfRung(instrument, rung) {
    return INSTRUMENT_GOAL[instrument](rung);
}
function engagementOptions() {
    return ENGAGEMENT_KINDS.map((engagement) => ({
        id: `engagement-${engagement}`,
        goal: "ties",
        family: "meet",
        name: ENGAGEMENT_NAMES[engagement],
        ref: { kind: "engagement", engagement },
    }));
}
function treatyOptions() {
    return Object.keys(TREATY_TERMS).map((treaty) => ({
        id: `treaty-${treaty}`,
        goal: "ties",
        family: "sign",
        name: TREATY_TERMS[treaty].name,
        ref: { kind: "treaty", treaty },
    }));
}
function rungOptions() {
    return [...INSTRUMENT_RUNGS]
        .filter((rung) => rung.id !== "economic-2")
        .sort((a, b) => a.rung - b.rung)
        .map((rung) => ({
        id: rung.id,
        goal: goalOfRung(rung.instrument, rung.rung),
        family: INSTRUMENT_FAMILY[rung.instrument],
        name: rung.name,
        ref: { kind: "instrument", instrument: rung.instrument, rung: rung.rung },
    }));
}
const TARIFF = { id: "tariff", goal: "trade", family: "tariff", name: "Tariff under a trade law", ref: { kind: "tariff" } };
// Capture and indictment ride the covert regime slot as a request field only; the player meets them as a force act and a Justice Department act.
const INDICT = { id: "indict", goal: "pressure", family: "justice", name: "Seek an indictment of its leader", ref: { kind: "instrument", instrument: "covert", rung: 5, regimeAct: "indict" } };
const CAPTURE = { id: "capture", goal: "force", family: "military", name: "Apprehend an indicted leader", ref: { kind: "instrument", instrument: "covert", rung: 5, regimeAct: "capture" } };
const AUTHORIZATION = { id: "authorization", goal: "force", family: "congress", name: "Ask Congress to authorize force", ref: { kind: "authorization" } };
// The order families read in within a goal: the gentlest kind of act first.
const FAMILY_ORDER = ["meet", "sign", "assist", "diplomatic", "justice", "economic", "tariff", "covert", "military", "congress"];
/** Every option, in the order a goal lists them. */
export const ACT_OPTIONS = [...engagementOptions(), ...treatyOptions(), ...rungOptions(), INDICT, CAPTURE, TARIFF, AUTHORIZATION]
    .map((option, index) => ({ option, index }))
    .sort((a, b) => FAMILY_ORDER.indexOf(a.option.family) - FAMILY_ORDER.indexOf(b.option.family) || a.index - b.index)
    .map(({ option }) => option);
export function isActGoal(value) {
    return value !== undefined && ACT_GOALS.includes(value);
}
export function optionsForGoal(goal) {
    return ACT_OPTIONS.filter((option) => option.goal === goal);
}
export function actOption(id) {
    return id === "economic-2" ? TARIFF : id === undefined ? undefined : ACT_OPTIONS.find((option) => option.id === id);
}
/** A goal's options in their runs, each run named once. */
export function familiesOfGoal(goal) {
    const options = optionsForGoal(goal);
    const families = [...new Set(options.map((option) => option.family))];
    return families.map((family) => ({ family, name: ACT_FAMILY_NAMES[family], options: options.filter((option) => option.family === family) }));
}
/** The settings an instrument option is read under: a capture or an indictment fixes the regime act, whatever the address names. */
export function configUnder(ref, config) {
    if (ref.kind !== "instrument")
        return config;
    if (ref.regimeAct)
        return { ...config, regimeAct: ref.regimeAct };
    if (ref.instrument === "covert" && ref.rung === 5 && (config.regimeAct === "capture" || config.regimeAct === "indict")) {
        const { regimeAct: _regimeAct, ...rest } = config;
        return rest;
    }
    return config;
}
/** The option an instrument rung is, for the addresses that still name the instrument. */
export function optionForRung(instrument, rung) {
    return instrument === "economic" && rung === 2 ? TARIFF : ACT_OPTIONS.find((option) => option.ref.kind === "instrument" && option.ref.instrument === instrument && option.ref.rung === rung && option.ref.regimeAct === undefined);
}
/** The act workspace for one government, opened on a goal and an option where one is given. */
export function actHref(nation, config = {}) {
    const goal = config.goal ?? actOption(config.option)?.goal;
    const query = {
        ...(goal ? { goal } : {}),
        ...(config.option ? { option: config.option } : {}),
        ...(config.count !== undefined ? { count: String(config.count) } : {}),
        ...(config.sector ? { sector: config.sector } : {}),
        ...(config.rate !== undefined ? { rate: String(config.rate) } : {}),
        ...(config.statute ? { statute: config.statute } : {}),
        ...(config.support ? { support: config.support } : {}),
        ...(config.partners?.length ? { partners: config.partners.join(",") } : {}),
        ...(config.strikeObjective ? { strikeObjective: config.strikeObjective } : {}),
        ...(config.civilianProtection ? { civilianProtection: config.civilianProtection } : {}),
        ...(config.regimeAct ? { regimeAct: config.regimeAct } : {}),
        ...(config.manage ? { manage: config.manage } : {}),
        ...(config.compare?.length ? { compare: config.compare.join(",") } : {}),
        ...(config.then ? { then: config.then } : {}),
    };
    return subjectHrefWith({ kind: "nationAct", id: nation }, query);
}
/** Reopen the authorized operation without replacing its selected terms with defaults. */
export function issuedInstrumentHref(act) {
    return `${actHref(act.request.target, {
        option: act.request.regimeAct === "capture" || act.request.regimeAct === "indict" ? act.request.regimeAct : `${act.request.instrument}-${act.request.rung}`,
        ...(act.request.force ? { count: act.request.force.count } : {}),
        ...(act.request.support ? { support: act.request.support.mode, partners: act.request.support.partners } : {}),
        ...(act.request.strikeObjective ? { strikeObjective: act.request.strikeObjective } : {}),
        ...(act.request.civilianProtection ? { civilianProtection: act.request.civilianProtection } : {}),
        ...(act.request.regimeAct ? { regimeAct: act.request.regimeAct } : {}),
    })}#${encodeURIComponent(`operation-${act.id}`)}`;
}
