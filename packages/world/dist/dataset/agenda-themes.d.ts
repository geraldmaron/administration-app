export declare const AGENDA_THEMES: readonly ["security", "economic", "prestige", "autonomy", "internal"];
export type AgendaTheme = (typeof AGENDA_THEMES)[number];
export declare function agendaTheme(agendaId: string): AgendaTheme | undefined;
export declare function allCandidateAgendaIds(): readonly string[];
