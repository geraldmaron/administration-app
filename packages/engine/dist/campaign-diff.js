export function diffCampaign(before, after) {
    const entries = [];
    diffValue("", before, after, entries);
    return entries;
}
function diffValue(path, before, after, entries) {
    if (Object.is(before, after))
        return;
    const bothPlainObjects = isPlainObject(before) && isPlainObject(after);
    if (!bothPlainObjects) {
        entries.push({ path, before, after });
        return;
    }
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
        diffValue(path ? `${path}.${key}` : key, before[key], after[key], entries);
    }
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
