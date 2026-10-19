import type { ResolutionSequenceDef, ResolutionSequencePack } from "../resolution-beat.js";
import { COVERT_RESOLUTION_SEQUENCES } from "./resolution-sequences/covert.js";
import { MILITARY_RESOLUTION_SEQUENCES } from "./resolution-sequences/military.js";

// The bundled staged resolution: what plays between the order and the packet on
// every install, before a single remote pack arrives.
//
// It opens on the two instruments the ceremony was designed for. A diplomatic
// démarche resolves in a room and reads well enough as a single aftermath card;
// a strike, a crossing and an operation are the acts that take hours the player
// should watch pass, so military and covert are where the staged form earns its
// keep and where the bank starts. Diplomatic, economic and assistance are
// deliberately empty rather than thinly filled — an unauthored cell falls back
// to the unstaged path, and a padded one would ship a sequence nobody wrote.
//
// Every cell either instrument can reach is filled: three rung bands crossed
// with success, partial, and each of that instrument's three named failure
// branches. Success and partial carry two sequences apiece because they are the
// cells a campaign draws most, and one sequence in a hot cell is a line the
// player learns by heart.

export const CORE_RESOLUTION_SEQUENCES: readonly ResolutionSequenceDef[] = [
  ...MILITARY_RESOLUTION_SEQUENCES,
  ...COVERT_RESOLUTION_SEQUENCES,
];

export const coreResolutionSequencePack: ResolutionSequencePack = {
  id: "core-resolution-sequences",
  version: 1,
  sequences: [...CORE_RESOLUTION_SEQUENCES],
};

export { COVERT_RESOLUTION_SEQUENCES, MILITARY_RESOLUTION_SEQUENCES };
