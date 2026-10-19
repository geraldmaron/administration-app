import { useMemo } from "react";
import type { Campaign, HillPostId, LobbyApproach } from "@admin/engine";
import { LOBBY_APPROACHES, lobbyComparison, lobbyPacket } from "@admin/player-core";
import { HillAct, type HillCommit } from "./HillAct";

/** Every way to work one member, against leaving them be. */
export function LobbyActs({ campaign, acts, post }: { readonly campaign: Campaign; readonly acts: HillCommit; readonly post: HillPostId }) {
  const comparison = useMemo(() => lobbyComparison(campaign, post), [campaign, post]);
  if (!comparison) return <p className="hill-note">Nobody holds this post, so there is nobody to work.</p>;
  return (
    <HillAct tier="confirm"
      key={post}
      id={`lobby:${post}`}
      title="Compare the approaches"
      comparison={comparison}
      acts={acts}
      packet={(option) => {
        const approach = LOBBY_APPROACHES.find((entry) => entry === option);
        if (!approach) throw new Error("Pick an approach to authorize.");
        return lobbyPacket(campaign, post, approach satisfies LobbyApproach);
      }}
      again="Compare the approaches again"
      projectAs={{
        campaign,
        act: (option) => {
          const approach = LOBBY_APPROACHES.find((entry) => entry === option);
          return approach ? { act: "lobby", post, approach } : undefined;
        },
      }}
    />
  );
}
