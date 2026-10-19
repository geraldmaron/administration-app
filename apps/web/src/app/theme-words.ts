import type { ThemeChoice } from "@admin/player-core";
import type { IconName } from "@admin/ui-web";

/** How each theme choice is named wherever the player picks one: Settings and the top bar. */
export const THEME: Readonly<Record<ThemeChoice, { readonly label: string; readonly detail: string; readonly icon: IconName }>> = {
  system: { label: "System", detail: "Follows this device, and changes when it does.", icon: "utilityThemeSystem" },
  light: { label: "Light", detail: "White workspace, navy navigation.", icon: "utilityThemeLight" },
  dark: { label: "Dark", detail: "Navy workspace for low light.", icon: "utilityThemeDark" },
};
