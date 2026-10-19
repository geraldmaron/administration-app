import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import type { Campaign } from "@admin/engine";
import { Column, Page, Text } from "@admin/ui";
import { useCampaignState } from "../device/hooks";

/**
 * A working screen needs an administration in play: while the vault opens it
 * says so, with none in play it returns to the title, and a vault that failed
 * goes to the title's honest error rather than an empty game.
 */
export function InTerm({ children }: { readonly children: (campaign: Campaign) => ReactNode }) {
  const state = useCampaignState();
  if (state.status === "loading") {
    return (
      <Page title="Opening your game" eyebrow="One moment">
        <Column>
          <Text tone="secondary">Loading your saved games.</Text>
        </Column>
      </Page>
    );
  }
  if (state.status !== "ready") return <Redirect href="/" />;
  return <>{children(state.campaign)}</>;
}
