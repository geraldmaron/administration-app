import type { ReactNode } from "react";
export type DocumentState = "draft" | "issued" | "in-effect" | "challenged" | "stayed" | "expired" | "revoked" | "vetoed" | "signed" | "pending";
export type DocumentSection = {
    /** The operative heading: "Purpose", "Directive", "Resources", "Effective date". */
    readonly heading: string;
    readonly body: ReactNode;
};
export type DocumentProps = {
    /** "The White House" or the issuing office. */
    readonly issuer: string;
    /** "Executive order", "Presidential memorandum", "Proclamation", "Bill", "Treaty". */
    readonly kind: string;
    readonly title: string;
    /** A game record id or simulated number; shown as-is, never dressed up as a real citation. */
    readonly reference?: string;
    /** The date line: "Draft prepared February 3, 2029" or "Issued February 3, 2029". */
    readonly dated: string;
    readonly state: DocumentState;
    /** The state as words, when the default would mislead: "Awaiting signature", "Stayed by the court". */
    readonly stateLabel?: string;
    readonly sections: readonly DocumentSection[];
    /** The signature block: who signs, and whether it has been signed. */
    readonly signature?: {
        readonly name: string;
        readonly title: string;
        readonly signed: boolean;
    };
    readonly children?: ReactNode;
};
/**
 * A presidential instrument as paper: issuer, kind, title, reference, date,
 * state, numbered operative sections and the signature block. A draft is
 * marked as one throughout, so an unsigned page never reads as issued.
 */
export declare function Document({ issuer, kind, title, reference, dated, state, stateLabel, sections, signature, children }: DocumentProps): import("react").JSX.Element;
