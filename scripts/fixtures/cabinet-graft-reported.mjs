import { graftStages } from "./_cabinet-graft.mjs";

export const name = "cabinet-graft-reported";

export function build() {
  return graftStages().reported;
}
