import { ASSISTANCE_CONSEQUENCES } from "./consequences/assistance.js";
import { BRIEFING_CONSEQUENCES } from "./consequences/briefing.js";
import { COVERT_CONSEQUENCES } from "./consequences/covert.js";
import { DIPLOMATIC_CONSEQUENCES } from "./consequences/diplomatic.js";
import { ECONOMIC_CONSEQUENCES } from "./consequences/economic.js";
import { MILITARY_CONSEQUENCES } from "./consequences/military.js";
// The bundled aftermath: what every install carries before a single remote
// pack arrives, and therefore the floor the draw can always reach.
//
// The five instrument lists are the floor itself, and every card in them is
// unconditioned — no gate, no once, no named failure branch — because the whole
// point of a floor is that it is there on every campaign, whatever the board
// looks like and whichever branch fired. Two per cell of the instrument by band
// by valence matrix, so nothing is ever told the same way twice in a row. They
// are split by instrument rather than kept in one file because each instrument
// is written in its own register and a writer working on one should not have to
// scroll past the rest.
//
// The briefing list is the deliberate exception and sits apart for that reason:
// its cards are gated on whether the claim the act rested on turned out to be
// true, so they are drawn on top of the floor rather than as part of it. They
// can never leave a cell empty, because a conditioned card was never what was
// holding a cell up.
export const CORE_CONSEQUENCES = [
    ...DIPLOMATIC_CONSEQUENCES,
    ...ECONOMIC_CONSEQUENCES,
    ...COVERT_CONSEQUENCES,
    ...MILITARY_CONSEQUENCES,
    ...ASSISTANCE_CONSEQUENCES,
    ...BRIEFING_CONSEQUENCES,
];
export const coreConsequencePack = {
    id: "core-consequences",
    version: 1,
    consequences: [...CORE_CONSEQUENCES],
};
export { ASSISTANCE_CONSEQUENCES, BRIEFING_CONSEQUENCES, COVERT_CONSEQUENCES, DIPLOMATIC_CONSEQUENCES, ECONOMIC_CONSEQUENCES, MILITARY_CONSEQUENCES, };
