import { CABINET_CHAIR_TITLES, PLAYABLE_CHAIR_TITLES, isPlayableChairTitle, isPlayableInstitution, CABINET_TITLE_PATTERN, CAPABILITY_NOUNS, CHARTER_INSTITUTIONS, DOUBLED_WORDS, FILLER_PHRASES, HONORIFIC_NAME_PATTERN, inventedProperNounIn, MAGNITUDE_FIGURE, NATION_PROPER_NOUNS, NEWS_ORGANIZATIONS, NUMERAL_FIGURE, phraseIn, properNounIn, SPELLED_CAPABILITY_FIGURE, STILTED_WORDS, } from "./audit-lexicon.js";
import { britishSpellingIn, mechanicsWordIn } from "./language.js";
export const excerpt = (text) => `${text.slice(0, 60)}${text.length > 60 ? "…" : ""}`;
export function auditPassageLanguage(passage, options, emit) {
    const { label, text } = passage;
    const error = (kind, message) => emit(kind, "error", message);
    const mechanics = mechanicsWordIn(text);
    if (mechanics)
        error("mechanics-language", `"${mechanics}" is engine language and cannot reach a player: "${excerpt(text)}"`);
    const british = britishSpellingIn(text);
    if (british)
        error("british-spelling", `player copy is American English: "${british}" in "${excerpt(text)}"`);
    const doubled = phraseIn(text, DOUBLED_WORDS);
    if (doubled)
        error("doubled-word", `${label} repeats a word: "${doubled}" in "${excerpt(text)}"`);
    const filler = phraseIn(text, FILLER_PHRASES);
    if (filler)
        error("filler-language", `${label} slips out of register: "${filler}"`);
    // The opposite register break from filler: the room reaching above the words
    // people use. A warning, because a single word is a writer's call — the rule
    // exists so the call gets made on purpose rather than by a generator
    // dressing a sentence up.
    const stilted = phraseIn(text, STILTED_WORDS);
    if (stilted) {
        emit("stilted-register", "warning", `${label} reaches for "${stilted}" where a plain word would do — this room talks like people, not like a proclamation: "${excerpt(text)}"`);
    }
    const outlet = properNounIn(text, NEWS_ORGANIZATIONS);
    if (outlet)
        error("press-organization", `${label} names the real outlet "${outlet}" — the papers in this world are its own`);
    const numeral = options.numerals ? NUMERAL_FIGURE.exec(text)?.[0]?.trim() : undefined;
    if (numeral) {
        error("numeral-in-prose", `${label} writes "${numeral}" in figures — say it the way a person says it out loud ("five million dollars", not "$5 million"): "${excerpt(text)}"`);
    }
    if (options.ceiling !== undefined && text.length > options.ceiling) {
        error("overlong-text", `${label} runs ${text.length} characters, over the ${options.ceiling} this field allows`);
    }
    if (options.target !== undefined && text.length < options.target) {
        emit("thin-text", "warning", `${label} runs ${text.length} characters against a ${options.target} target — it states the beat rather than writing it: "${excerpt(text)}"`);
    }
    for (const match of text.matchAll(/\{\{\s*([a-zA-Z]+)\s*\}\}/g)) {
        if (!options.placeholders.includes(match[1])) {
            error(options.placeholderKind, `"{{${match[1]}}}" is not a placeholder the binder fills`);
        }
    }
}
export function auditPassageNeutrality(passage, options, emit) {
    const { label, text } = passage;
    const error = (kind, message) => emit(kind, "error", message);
    const literalInstitution = properNounIn(text, CHARTER_INSTITUTIONS);
    const institution = literalInstitution && !isPlayableInstitution(literalInstitution) ? literalInstitution : undefined;
    if (institution) {
        error("charter-institution-literal", `${label} names "${institution}", a body only one charter has — a campaign founded under another has no such thing`);
    }
    // The live constitution's own titles are what the cabinet screen shows, so
    // prose may use them. Everything else this matches is another charter's
    // vocabulary, or a seat invented in the sentence.
    const literalChair = properNounIn(text, CABINET_CHAIR_TITLES) ?? CABINET_TITLE_PATTERN.exec(text)?.[0];
    const chair = literalChair && !isPlayableChairTitle(literalChair) ? literalChair : undefined;
    if (chair) {
        error("cabinet-title-literal", `${label} names the chair "${chair}", which is not what this constitution calls one of its own seats — use the title the cabinet screen shows (${PLAYABLE_CHAIR_TITLES.slice(0, 3).join(", ")}…)`);
    }
    const namedIndividual = HONORIFIC_NAME_PATTERN.exec(text)?.[0];
    if (namedIndividual) {
        error("hardcoded-individual", `${label} invents a specific person, "${namedIndividual}" — nobody but the seated cast exists at generation time; use a role or function instead ("the general who ran the facility")`);
    }
    // The same defect without the title to catch it: "Seat Marchen", "Restwell
    // Cemetery". Everything the board can genuinely name arrives through a
    // placeholder, so any other mid-sentence capital is a name somebody invented
    // — a person who exists in no campaign, a place no map will carry.
    const invented = inventedProperNounIn(text);
    if (invented) {
        error("invented-proper-noun", `${label} invents the proper noun "${invented}" — no person or place exists to be named at generation time; ` +
            `point by role or description instead ("the senior judge", "the old cemetery on the ridge"): "${excerpt(text)}"`);
    }
    if (options.allowNationNames)
        return;
    const nation = properNounIn(text, NATION_PROPER_NOUNS);
    if (nation) {
        error("nation-name-in-generic", `${label} names "${nation}" but the scenario casts by board state — use the binder's tokens`);
    }
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        const figure = MAGNITUDE_FIGURE.exec(sentence)?.[0];
        const noun = figure ? phraseIn(sentence, CAPABILITY_NOUNS) : undefined;
        if (figure && noun) {
            error("literal-capability-figure", `${label} pins "${noun}" to the figure "${figure.trim()}", which is true of one nation and false of whoever gets cast`);
        }
    }
    // Spelling figures out is what player copy is held to, so the same claim
    // has to be refused in words or the rule above only catches the drafts
    // that were going to be rewritten anyway.
    const spelled = SPELLED_CAPABILITY_FIGURE.exec(text)?.[0];
    if (spelled) {
        error("literal-capability-figure", `${label} counts out "${spelled.trim()}", which is true of one nation and false of whoever gets cast — write the scale, not the count`);
    }
}
