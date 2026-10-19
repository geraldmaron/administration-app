// The board builders moved to ../preview-board.ts once the publish gate began
// asking the same question tests do — whether a scenario ever reaches a player.
// Re-exported here so the tests that named this path keep naming it.
export { sealedCampaign, underStrain, withFlags, withLoneEdge } from "../preview-board.js";
