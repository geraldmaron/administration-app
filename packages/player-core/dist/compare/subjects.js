/** The government the President runs. */
export function selfNation(campaign) {
    return campaign.founding.nation;
}
/** A nation subject naming the President's own government is the President's own reading. */
export function isSelfSubject(campaign, subject) {
    return subject.kind === "self" || (subject.kind === "nation" && subject.id === selfNation(campaign));
}
/** The President's own government named as a nation is the `self` subject, so it is never listed twice. */
export function normalizeSubject(campaign, subject) {
    return subject.kind === "nation" && subject.id === selfNation(campaign) ? { kind: "self" } : subject;
}
/** "the United Kingdom", "France": a name that reads inside a sentence. */
export function nationName(runtime) {
    const { name, definiteArticle } = runtime.base.identity;
    return definiteArticle ? `the ${name}` : name;
}
const capitalized = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** "Week 12" from the oath, or how far before it an inherited week sits. */
export function weekLabel(turn) {
    if (turn >= 1)
        return `Week ${turn}`;
    const before = 1 - turn;
    return `${before} ${before === 1 ? "week" : "weeks"} before the oath`;
}
/** A stable key for a subject, unique within one comparison. */
export function subjectKey(subject) {
    switch (subject.kind) {
        case "self":
            return "self";
        case "self-at":
            return `self-at:${subject.turn}`;
        case "nation":
            return `nation:${subject.id}`;
        case "state":
            return `state:${subject.id}`;
        case "history":
            return `history:${subject.benchmarkId}`;
    }
}
/** What a subject is called on a legend or a row, before any history label is resolved. */
export function entityLabel(campaign, subject) {
    switch (subject.kind) {
        case "self":
            return "This presidency";
        case "self-at":
            return subject.turn === 1 ? "At the oath" : `This presidency, ${weekLabel(subject.turn).toLowerCase()}`;
        case "nation": {
            const runtime = campaign.nations[subject.id];
            if (subject.id === selfNation(campaign))
                return "This presidency";
            return runtime ? capitalized(nationName(runtime)) : subject.id;
        }
        case "state":
            return campaign.states[subject.id]?.base.name ?? subject.id;
    }
}
