import Svg, { Circle } from "react-native-svg";
import { COLOR_VISION_PALETTES, CEREMONY_CHOICES, THEME_CHOICES, type CeremonyChoice, type ColorVisionPalette, type ThemeChoice } from "@admin/player-core";
import { partyPalettes } from "@admin/design";
import type { IconName } from "@admin/ui";
import { ChoiceList, Segmented, Toggle } from "@admin/ui/forms";
import { usePreferences } from "../device/hooks";
import { SettingsGroup } from "./parts";

const THEME: Readonly<Record<ThemeChoice, { readonly label: string; readonly detail: string; readonly icon: IconName }>> = {
  system: { label: "System", detail: "Matches your device's light or dark setting, and changes when it does.", icon: "utilityThemeSystem" },
  light: { label: "Light", detail: "A white background with navy menus.", icon: "utilityThemeLight" },
  dark: { label: "Dark", detail: "A navy background that's easier on the eyes in low light.", icon: "utilityThemeDark" },
};

const VISION: Readonly<Record<ColorVisionPalette, { readonly label: string; readonly detail: string }>> = {
  standard: { label: "Standard", detail: "Blue for Democrats and red for Republicans, with shades from blue to red on maps." },
  protan: { label: "Protanopia", detail: "For people who see red weakly. Uses blue and orange." },
  deutan: { label: "Deuteranopia", detail: "For people who see green weakly. Uses blue and orange." },
  tritan: { label: "Tritanopia", detail: "For people who see blue weakly. Uses light blue and red." },
};

const CEREMONY: Readonly<Record<CeremonyChoice, string>> = { full: "Full", reduced: "Reduced" };

/** The three parties in the palette the option would draw, so the choice is seen before it is made. The ink is the reading itself. */
function PaletteSample({ vision }: { readonly vision: ColorVisionPalette }) {
  const palette = partyPalettes[vision];
  return (
    <Svg width={54} height={18} aria-hidden>
      <Circle cx={9} cy={9} r={8} fill={palette.democrat} />
      <Circle cx={27} cy={9} r={8} fill={palette.independent} />
      <Circle cx={45} cy={9} r={8} fill={palette.republican} />
    </Svg>
  );
}

/** Theme, contrast, the color-vision palette and how much the presidential review moves. */
export function Appearance() {
  const { preferences, update } = usePreferences();
  return (
    <SettingsGroup icon="utilitySettings" title="Appearance and accessibility" description="These settings apply to every presidency saved on this device, and they change right away.">
      <Segmented
        label="Theme"
        help={THEME[preferences.theme ?? "system"].detail}
        options={THEME_CHOICES.map((theme) => ({ value: theme, label: THEME[theme].label, icon: THEME[theme].icon }))}
        value={preferences.theme ?? "system"}
        onChange={(theme) => update({ theme })}
      />
      <Toggle label="High contrast" hint="Makes text, borders, and outlines darker and easier to see." value={preferences.highContrast === true} onChange={(highContrast) => update({ highContrast })} />
      <ChoiceList
        label="Colors for color blindness"
        minCardWidth={260}
        options={COLOR_VISION_PALETTES.map((palette) => ({ value: palette, label: VISION[palette].label, detail: VISION[palette].detail, visual: <PaletteSample vision={palette} /> }))}
        value={preferences.colorVision ?? "standard"}
        onChange={(colorVision) => update({ colorVision })}
      />
      <Segmented
        label="Animation when you confirm"
        help="Reduced turns off the animation when you confirm a big decision. You'll still be asked to confirm. If your device is set to reduce motion, Reduced is always used."
        options={CEREMONY_CHOICES.map((choice) => ({ value: choice, label: CEREMONY[choice] }))}
        value={preferences.ceremony ?? "full"}
        onChange={(ceremony) => update({ ceremony })}
      />
    </SettingsGroup>
  );
}
