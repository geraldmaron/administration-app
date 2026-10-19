import { graftStages } from "./_cabinet-graft.mjs";

export const name = "cabinet-graft-opened";

export function build() {
  return graftStages().opened;
}
