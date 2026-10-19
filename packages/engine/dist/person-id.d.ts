/**
 * The id a generated person carries: their nation, the seat they were drawn
 * for, and their place on its shortlist. Index 0 of a foreign lead chair is
 * the incumbent the leader table describes.
 */
export declare function personIdFor(nation: string, role: string, index: number): string;
