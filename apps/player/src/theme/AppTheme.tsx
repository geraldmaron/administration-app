import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import { TamaguiProvider, Theme, config } from "@admin/ui";
import { usePreferences } from "../device/hooks";

type Scheme = "light" | "dark";
type ThemeName = Scheme | `${Scheme}_contrast` | `${Scheme}_${"protan" | "deutan" | "tritan"}` | `${Scheme}_contrast_${"protan" | "deutan" | "tritan"}`;

/** The theme name the player's settings and the system resolve to: System, Light or Dark, with or without high contrast, and with the party inks of the chosen color vision. */
export function useThemeName(): ThemeName {
  const system = useColorScheme();
  const { preferences } = usePreferences();
  const scheme = preferences.theme === "light" || preferences.theme === "dark" ? preferences.theme : system === "dark" ? "dark" : "light";
  const base = preferences.highContrast ? (`${scheme}_contrast` as const) : scheme;
  const vision = preferences.colorVision;
  return vision && vision !== "standard" ? `${base}_${vision}` : base;
}

function ThemedTree({ children }: { readonly children: ReactNode }) {
  const name = useThemeName();
  return <Theme name={name}>{children}</Theme>;
}

/** Tamagui over the player's chosen theme; rendered inside the preferences provider. */
export function AppTheme({ children }: { readonly children: ReactNode }) {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <ThemedTree>{children}</ThemedTree>
    </TamaguiProvider>
  );
}
