import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import type { Campaign } from "@admin/engine";
import { EmptyState } from "@admin/ui-web";
import { Screen } from "./Screen";
import { useCampaignState } from "../app/hooks";

/**
 * A screen inside the modes needs a presidency to read. Without one the
 * player is sent to the title, and a failed read goes to recovery.
 */
export function InTerm({ children }: { readonly children: (campaign: Campaign) => ReactNode }) {
  const state = useCampaignState();
  if (state.status === "loading") return <Screen title="Opening the administration" icon="archive" eyebrow="Saved administration" screenClass="workspace" camera="us"><EmptyState busy title="Reading your saved state">Your presidency will resume when its records are ready.</EmptyState></Screen>;
  if (state.status === "failed") return <Navigate to="/recovery" replace />;
  if (state.status === "empty") return <Navigate to="/" replace />;
  return <>{children(state.campaign)}</>;
}
