import { type ReactNode } from "react";
export type EvidencePanelProps = {
    readonly title: string;
    readonly label?: string;
    readonly children: ReactNode | ((close: () => void) => ReactNode);
};
/** One contextual drill-down: keep the subject, route, selection and scroll behind the inspector. */
export declare function EvidencePanel({ title, label, children }: EvidencePanelProps): import("react").JSX.Element;
