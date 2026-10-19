import { underDeclaredEmergency, projectGovernorWillingness } from "@admin/engine";
import { PARTY_WORDS, governorDispositionWord } from "./state-dossier";
import { localeActOptions, localeMatters } from "./locale-act-options";
const MEANING = {
    likely: "Likely to agree to sending in the National Guard.",
    close: "Could go either way on sending in the National Guard.",
    unlikely: "Unlikely to agree to sending in the National Guard.",
};
const BAND_OF = { Allied: "allied", Cooperative: "cooperative", Guarded: "guarded", Opposed: "opposed" };
/** Where the President stands with one state: its governor, what it needs from Washington, and what can be done about it. */
export function stateRelationship(campaign, id) {
    const runtime = campaign.states[id];
    if (!runtime)
        return undefined;
    const matters = localeMatters(campaign, id);
    const lead = matters[0];
    const standing = runtime.governor;
    const word = standing ? governorDispositionWord(standing.disposition) : undefined;
    const forecast = standing ? projectGovernorWillingness(campaign, id, { severity: lead?.severity ?? 0, of: "national-guard" }).forecast : undefined;
    return {
        id,
        ...(standing ? { governor: { person: standing.person, name: campaign.people[standing.person]?.base.name ?? "The governor", party: standing.party, partyWord: PARTY_WORDS[standing.party] } } : {}),
        ...(standing ? { disposition: standing.disposition } : {}),
        ...(word ? { band: BAND_OF[word] } : {}),
        word: word ?? "No governor",
        meaning: forecast ? MEANING[forecast] : id === "DC" ? "Washington, D.C., has no governor, so federal actions there don't need a state's approval." : "There's no governor in office right now, so there's no relationship to show.",
        leansAgainst: word === "Guarded" || word === "Opposed",
        ...(standing?.termEnds ? { termEnds: standing.termEnds } : {}),
        needs: matters.map((matter) => ({ cause: matter.cause, title: matter.title, requested: matter.request !== undefined })),
        needsCount: matters.length,
        declared: underDeclaredEmergency(campaign, id),
        actCount: lead ? localeActOptions(campaign, id, lead.cause).filter((option) => !option.locked).length : 0,
    };
}
