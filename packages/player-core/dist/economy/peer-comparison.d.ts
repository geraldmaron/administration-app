import { type ComparisonWindow } from "./comparison.js";
import type { EconomyHistoryRate } from "./history.js";
/** The measures countries can be set beside each other on: the three the campaign also reads, and population growth. */
export type PeerMeasure = EconomyHistoryRate | "population";
export declare const PEER_MEASURES: readonly PeerMeasure[];
/** The countries the reference pack holds, in the order they are offered. */
export declare const PEER_GROUP: readonly {
    readonly id: string;
    readonly name: string;
}[];
export declare const MAX_PEERS = 4;
export type PeerPoint = {
    readonly year: number;
    readonly label: string;
    readonly value: number | undefined;
    readonly gap?: string;
};
export type PeerSeries = {
    readonly id: string;
    readonly name: string;
    readonly evidence: "observed" | "estimated";
    readonly points: readonly PeerPoint[];
};
export type PeerWindow = ComparisonWindow & {
    readonly available: boolean;
    readonly reason?: string;
};
export type PeerView = {
    readonly rate: PeerMeasure;
    readonly peers: readonly string[];
    readonly windows: readonly PeerWindow[];
    readonly selected: PeerWindow;
    readonly series: readonly PeerSeries[];
    readonly unavailable?: string;
    /** What the figures are, in one line: the series, its provider and what its evidence class means. */
    readonly basis: string;
    readonly caution: string;
};
/** Peers kept to the pack's countries, without repeats, at most `MAX_PEERS`. */
export declare function normalizePeers(requested: readonly string[]): readonly string[];
export declare function peerComparisonView(rate: PeerMeasure, requested: readonly string[], windowId: string): PeerView;
