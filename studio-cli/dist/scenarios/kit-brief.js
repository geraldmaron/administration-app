import { ScenarioCast, ScenarioClass, ScenarioSeverity } from "@admin/content";
import { PersonaId, personaFor } from "../personas/index.js";
import { BIND_THE_CABINET, CHANNEL_SECTION, CLASS_CONTRACT, CLASS_SCOPE, CRAFT_RULES, PLAIN_WORDS, REGISTER_SECTION, RIPPLES_SECTION, SEVERITY_TIERS, contextSection, doctrineSection, doctrineSpread, gateSummary, impactSection, personaSection, writeInThisOrderSection, } from "./brief.js";
import { bindingSection } from "./brief-binding.js";
import { candidatesSection } from "./brief-candidates.js";
import { reportBriefSection } from "./brief-report.js";
import { billBriefSection } from "./brief-bill.js";
import { judicialBriefSection } from "./brief-judicial.js";
import { courtBriefSection } from "./brief-court.js";
/**
 * Every cast an outside author may pick: the schema's own list, less "nation".
 * A named-nation cast is a set-piece, which needs an owner and a reason the
 * kit cannot supply, so it stays an in-repo decision.
 */
export const KIT_CASTS = ScenarioCast.options
    .map((option) => option.shape.pick.value)
    .filter((pick) => pick !== "nation");
const BASE_SPEC = { class: "economy", severity: "serious", cast: "band", count: 1 };
function specialSections(spec) {
    return [
        ...candidatesSection(spec),
        ...reportBriefSection(spec),
        ...billBriefSection(spec),
        ...judicialBriefSection(spec),
        ...courtBriefSection(spec),
    ];
}
export function kitBrief() {
    return [
        "# The scenario brief",
        "",
        "Write scenario definitions for a political simulation game, as JSON ScenarioDef objects. Every scenario",
        "belongs to one cell: a class, a severity and a cast, chosen from CATALOG.md. The director for the cell is",
        "in DIRECTORS.md. Everything below holds for every cell.",
        "",
        REGISTER_SECTION,
        PLAIN_WORDS,
        writeInThisOrderSection(),
        "",
        "SEVERITY — how loud this week is. Every scenario carries its cell's severity, and the corpus is planned,",
        "counted and paced on that being true.",
        "",
        SEVERITY_TIERS,
        CHANNEL_SECTION,
        gateSummary(BASE_SPEC),
        "",
        CRAFT_RULES,
        "",
        impactSection(),
        "",
        RIPPLES_SECTION,
        "",
        contextSection(),
        "",
        doctrineSection([
            "   N below is the number of scenarios you are writing in one cell.",
            ...doctrineSpread("routine", "N"),
            ...doctrineSpread("serious or critical", "N"),
        ]),
        BIND_THE_CABINET,
        "",
        bindingSection(),
        "",
        "These shipped scenarios are the quality bar. Match their register exactly:",
        "they are in EXEMPLARS.json, beside this brief.",
        "",
    ].join("\n");
}
function castSection(cast) {
    const spec = { ...BASE_SPEC, cast };
    const base = new Set(gateSummary(BASE_SPEC).split("\n"));
    const extraGate = gateSummary(spec)
        .split("\n")
        .filter((line) => !base.has(line));
    // The domestic candidates list is ordered by class, so every distinct
    // ordering is printed rather than one class's.
    const special = [
        ...new Set(ScenarioClass.options.flatMap((klass) => specialSections({ ...spec, class: klass }).join("\n"))),
    ].filter((text) => text.length > 0);
    if (extraGate.length === 0 && special.length === 0)
        return [`### ${cast}`, "", "No rules beyond the brief's cast list.", ""];
    return [`### ${cast}`, "", ...(extraGate.length > 0 ? [...extraGate, ""] : []), ...special.flatMap((text) => [text, ""])];
}
export function kitCatalog() {
    return [
        "# The cell catalog",
        "",
        "A cell is class:cast:severity. Pick one cell per group of scenarios; every scenario in the group carries",
        'the same "class", "severity" and "cast.pick". The brief\'s gate list explains each cast pick in full.',
        "",
        "## Classes",
        "",
        CLASS_CONTRACT,
        "",
        ...ScenarioClass.options.map((klass) => `- "${klass}": ${CLASS_SCOPE[klass]}`),
        "",
        "## Severities",
        "",
        ...ScenarioSeverity.options.map((severity) => `- "${severity}"`),
        "",
        "Each tier is described under SEVERITY in BRIEF.md.",
        "",
        "## Casts",
        "",
        'The cast is "cast": { "pick": "<one of these>", ... }. "nation" (a set-piece about one named country) is',
        "not available through the kit: it needs an owner and a recorded reason.",
        "",
        ...KIT_CASTS.flatMap(castSection),
    ].join("\n");
}
const FOREIGN_CAST = "tensest";
export function kitDirectors() {
    const routing = ScenarioClass.options.map((klass) => {
        const tiers = ScenarioSeverity.options.map((severity) => {
            const home = personaFor({ class: klass, cast: "none", severity });
            const abroad = personaFor({ class: klass, cast: FOREIGN_CAST, severity });
            return home === abroad ? `${severity}: ${home}` : `${severity}: ${home} (at home), ${abroad} (with a counterpart)`;
        });
        return `- "${klass}" — ${tiers.join("; ")}`;
    });
    return [
        "# The directors",
        "",
        "Each cell is written under one director. Find yours in the routing below, then read only that director.",
        "",
        ...routing,
        "",
        ...PersonaId.options.flatMap((id) => [`## ${id}`, "", ...personaSection(id)]),
    ].join("\n");
}
