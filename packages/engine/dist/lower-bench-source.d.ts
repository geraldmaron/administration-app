export declare const LOWER_BENCH_SOURCE_DATE = "2026-10-11";
export type CourtSeatSourceRow = {
    readonly court: string;
    readonly authorized: number;
    readonly activeRepublican: number;
    readonly activeDemocratic: number;
    readonly vacancies: number;
};
export type DistrictSeatSourceRow = CourtSeatSourceRow & {
    readonly circuit: string;
    readonly state: string;
    readonly district: string;
    readonly pendingNominees: number;
    readonly note?: string;
};
export declare const CIRCUIT_SEAT_SOURCE: readonly CourtSeatSourceRow[];
export declare const DISTRICT_SEAT_SOURCE: readonly DistrictSeatSourceRow[];
