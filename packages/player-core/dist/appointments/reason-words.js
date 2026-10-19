// Why a nominee is on the list, in the words a staff memo uses. Every line is
// a fact the person's file already shows (years in a career, what they
// studied, where they are from, their age) or a band derived from one, and
// says so where it is derived. No reading of a hidden attribute and no score.
// Each career with the preposition it takes, so a list of two reads "as a
// judge and in the civil service".
const CAREER = {
    "civil-service": "in the civil service",
    "military-command": "in military command",
    "intelligence-service": "in intelligence work",
    "diplomatic-corps": "in the foreign service",
    "private-law": "in law practice",
    business: "in business",
    academia: "in teaching and research",
    "party-organizing": "in party work",
    "local-government": "in local government",
    "state-media": "in state media",
    "independent-press": "in journalism",
    activism: "in advocacy",
    medicine: "in medicine",
    "labor-union": "in the labor movement",
    judiciary: "as a judge",
};
const FIELD = {
    law: "law",
    economics: "economics",
    engineering: "engineering",
    "military-science": "military science",
    medicine: "medicine",
    "international-relations": "international relations",
    "public-administration": "public administration",
    journalism: "journalism",
    theology: "theology",
    "natural-sciences": "the natural sciences",
};
const TENURE = {
    decades: "At their age, they could serve for decades.",
    "a-decade-or-two": "At their age, they could serve for a decade or two.",
    "under-a-decade": "At their age, they could serve for less than a decade.",
};
const plural = (count, one) => `${count} ${one}${count === 1 ? "" : "s"}`;
function careers(list) {
    const words = list.map((archetype) => CAREER[archetype]);
    return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : (words[0] ?? "in the work");
}
/** One reason as a sentence. */
export function reasonWords(reason) {
    switch (reason.kind) {
        case "career":
            return `${plural(reason.years, "year")} ${careers(reason.careers)}.`;
        case "study":
            return `Studied ${FIELD[reason.field]}${reason.postgraduate ? ", with a graduate degree" : ""}.`;
        case "agency-bench":
            return "Has spent a career running government agencies.";
        case "serving":
            return `An active-duty officer with ${plural(reason.commandYears, "year")} in command.`;
        case "veteran":
            return `Left active duty ${plural(reason.yearsOut, "year")} ago.`;
        case "home-circuit":
            return `From the ${reason.circuit} Circuit.`;
        case "tenure":
            return TENURE[reason.band];
        case "party":
            return reason.side === "own" ? "From your party." : "From the other party.";
    }
}
/** The one-line case for a nominee: the two heaviest reasons. */
export function whyLine(reasons) {
    const lines = reasons.slice(0, 2).map(reasonWords);
    return lines.length > 0 ? lines.join(" ") : "Qualified, but nothing in their past points to this job in particular.";
}
