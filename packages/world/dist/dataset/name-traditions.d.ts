/**
 * The id of the tradition a name belongs to within its nation's bank, or
 * undefined when the bank is a single unnamed tradition or the name matches
 * none of them (an authored name, or a surname a name form rewrote).
 */
export declare function nameTraditionOf(name: string, nation: string): string | undefined;
