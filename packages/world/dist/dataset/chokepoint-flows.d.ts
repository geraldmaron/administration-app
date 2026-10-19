export type ChokepointFlowRow = {
    readonly chokepoint: string;
    readonly commodity: string;
    /** The governments on its shores: a war with any of them as a party contests the strait. */
    readonly littoral: readonly string[];
    /** 0..1 of world supply of the commodity that passes the strait. */
    readonly share: number;
    /** 0..1 of the strait's own flow a pipeline or a sea detour can carry when it is shut. */
    readonly bypass: number;
    readonly basis: string;
    readonly source: string;
    readonly opened: string;
};
export declare const CHOKEPOINT_FLOWS: readonly ChokepointFlowRow[];
