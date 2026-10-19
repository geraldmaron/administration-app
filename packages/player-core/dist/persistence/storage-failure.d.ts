/**
 * Storage exceptions name browser and SQLite APIs. Map them to a sentence a
 * president can read — LaunchFailure and the oath stage print this string as-is.
 */
export declare function playerFacingStorageFailure(error: unknown): string;
/**
 * Founding embeds the reason mid-sentence ("— ${failure} You can…"), so the
 * seal keeps a lowercase lead-in while still refusing raw Storage.setItem text.
 */
export declare function sealStorageFailureReason(error: unknown): string;
export declare function isQuotaExhausted(error: unknown): boolean;
