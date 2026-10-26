import { createContext } from "react";
import type { CampaignStore, DraftStore, EntitlementSnapshot, Preferences } from "@admin/player-core";

// The app's long-lived contexts, each created once in a module that imports
// nothing that changes, so a hot reload of a provider never creates a second
// context that screens would then read with no provider above them.

export type PreferencesHandle = {
  readonly preferences: Preferences;
  readonly update: (patch: Partial<Preferences>) => void;
};

export type EntitlementHandle = {
  readonly snapshot: EntitlementSnapshot;
  /** False until the device's cached answer has been read. */
  readonly known: boolean;
};

/** Null until the campaign store has loaded: the frame, the map and the title draw without it. */
export const CampaignContext = createContext<CampaignStore | null>(null);
/** The President's drafts, over the same campaign store; null until it has loaded. */
export const DraftsContext = createContext<DraftStore | null>(null);
export const PreferencesContext = createContext<PreferencesHandle | null>(null);
export const EntitlementContext = createContext<EntitlementHandle | null>(null);
