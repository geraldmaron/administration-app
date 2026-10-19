export const GOVERNING_STYLES = ["pragmatic", "principled", "cautious", "hawkish", "dovish"];
export function validLeadershipAnswers(answers) {
    const inRange = (value) => Number.isFinite(value) && value >= -1 && value <= 1;
    const stepped = (value) => Number.isInteger(value) && inRange(value);
    if (answers.values.length !== 20)
        return false;
    if (answers.version === 1)
        return answers.values.every(stepped);
    return answers.version === 2 && answers.values.every(inRange);
}
export function scoreLeadershipAnswers(answers) {
    if (!validLeadershipAnswers(answers))
        throw new Error("Answer all 20 leadership questions before using this profile.");
    const dimension = (start) => answers.values.slice(start, start + 4).reduce((sum, value) => sum + value, 0) / 4;
    const force = dimension(12);
    const compromise = dimension(16);
    const style = force >= 0.5 ? "hawkish" : force <= -0.5 ? "dovish" : compromise <= -0.5 ? "principled" : compromise >= 0.5 ? "pragmatic" : "cautious";
    return { ideology: { economicLeftRight: dimension(0), authLibertarian: dimension(4), nationalistGlobalist: dimension(8) }, style, force, compromise };
}
/** The stated approach takes priority over a conflicting career stereotype. */
export function withGoverningStyle(traits, style) {
    if (style === undefined)
        return traits;
    const opposite = { hawkish: "dovish", dovish: "hawkish", pragmatic: "principled", principled: "pragmatic" };
    return [...new Set([style, ...traits.filter((trait) => trait !== opposite[style])])].slice(0, 3);
}
