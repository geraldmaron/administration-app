import { type Desk, type OperatorTheme } from "./article-desk.js";
export declare function operatorThemeFromHeadline(headline: string): OperatorTheme;
/** The piece: what it is, what it costs the host, and what can reach it. Nothing when the item named no host. */
export declare function operatorParagraphs(desk: Desk): readonly string[] | undefined;
export declare function operatorStandfirst(desk: Desk): string | undefined;
export declare function operatorRelevance(reader: string, desk: Desk): string | undefined;
