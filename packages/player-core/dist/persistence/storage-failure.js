const NO_ROOM = "This device is out of storage space, so your game wasn't saved. Free up some space and try again.";
const COULD_NOT_STORE = "This device couldn't save your game. Try again, and if it keeps happening, free up some space.";
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
/**
 * Storage exceptions name browser and SQLite APIs. Map them to a sentence a
 * president can read — LaunchFailure and the oath stage print this string as-is.
 */
export function playerFacingStorageFailure(error) {
    if (isQuotaExhausted(error)) {
        return NO_ROOM;
    }
    const detail = error instanceof Error ? error.message : String(error);
    const trimmed = detail.trim().replace(/\s+/g, " ");
    if (!trimmed)
        return COULD_NOT_STORE;
    if (isStorageApiNoise(trimmed)) {
        return COULD_NOT_STORE;
    }
    // One line, bounded — never a stack dump.
    const line = trimmed.split(/[\r\n]/)[0].slice(0, 180);
    return line.length > 0 ? line : COULD_NOT_STORE;
}
/**
 * Founding embeds the reason mid-sentence ("— ${failure} You can…"), so the
 * seal keeps a lowercase lead-in while still refusing raw Storage.setItem text.
 */
export function sealStorageFailureReason(error) {
    const facing = playerFacingStorageFailure(error);
    if (facing === NO_ROOM) {
        return lowerFirst(NO_ROOM);
    }
    if (facing === COULD_NOT_STORE) {
        return lowerFirst(COULD_NOT_STORE);
    }
    return facing.charAt(0).toLowerCase() + facing.slice(1);
}
export function isQuotaExhausted(error) {
    if (typeof DOMException !== "undefined" && error instanceof DOMException) {
        // Legacy browsers used numeric code 22 for QUOTA_EXCEEDED_ERR.
        if (error.name === "QuotaExceededError" || error.code === 22)
            return true;
    }
    if (error && typeof error === "object" && "name" in error) {
        if (error.name === "QuotaExceededError")
            return true;
    }
    const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    return /quota\s*exceeded|exceeded the quota|QUOTA_EXCEEDED|QuotaExceededError/i.test(text);
}
function isStorageApiNoise(text) {
    return /failed to execute ['"`]?setItem['"`]?|localStorage|sessionStorage|IndexedDB|AsyncStorage|CursorWindow|SQLITE_FULL/i.test(text);
}
