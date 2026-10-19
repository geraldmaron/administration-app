import type { DisplayBloc } from "@admin/engine";

/** The three readings as a course is filed under them, whichever party the President belongs to. */
export const BLOC_NAMES: Readonly<Record<DisplayBloc, string>> = {
  own: "Your party and people who lean toward it",
  independent: "Independents",
  opposition: "The other party and people who lean toward it",
};
