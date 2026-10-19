import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CAMERA_MODES, COLOR_VISION_PALETTES, MAP_DENSITIES, THEME_CHOICES, type CameraMode, type ColorVisionPalette, type MapDensity } from "@admin/player-core";
import { Card, CardHeader, CardDescription, CardContent, Choice, Icon, Toggle, buttonClass, type IconName } from "@admin/ui-web";
import { usePreferences } from "../app/hooks";
import { THEME } from "../app/theme-words";
import { AttentionSettings } from "../screens/AttentionSettings";
import { GodModeRow } from "../screens/GodModeRow";
import { FIRST_RUN } from "../walkthrough/FirstRun";
import { Screen } from "../shell/Screen";

const CAMERA: Readonly<Record<CameraMode, { readonly label: string; readonly detail: string }>> = {
  fly: { label: "Fly", detail: "A smooth flight to each place." },
  quick: { label: "Quick", detail: "A short move, with a flight only for a far jump." },
  cut: { label: "Cut", detail: "No movement. Each place appears at once." },
};

const DENSITY: Readonly<Record<MapDensity, string>> = { fine: "Fine", standard: "Standard", bold: "Bold" };

const VISION: Readonly<Record<ColorVisionPalette, { readonly label: string; readonly detail: string }>> = {
  standard: { label: "Standard", detail: "Blue and red parties, blue to red ramps." },
  protan: { label: "Protanopia", detail: "For red-weak vision: blue and orange." },
  deutan: { label: "Deuteranopia", detail: "For green-weak vision: blue and orange." },
  tritan: { label: "Tritanopia", detail: "For blue-weak vision: cyan and red." },
};

function Group({ id, icon, title, description, children }: { readonly id: string; readonly icon: IconName; readonly title: string; readonly description: string; readonly children: ReactNode }) {
  return (
    <Card className="settings-group" role="region" aria-labelledby={id}><CardHeader>
      <h2 id={id} className="settings-group__title">
        <Icon name={icon} size={20} /> {title}
      </h2>
      <CardDescription>{description}</CardDescription></CardHeader>
      <CardContent><div className="settings-group__rows">{children}</div></CardContent>
    </Card>
  );
}

/** A row of swatches in the palette the setting would draw, so the choice is seen before it is made. */
function PaletteSample() {
  return (
    <p className="palette-sample" aria-hidden="true">
      <span data-party="democrat" />
      <span data-party="independent" />
      <span data-party="republican" />
    </p>
  );
}

function Appearance() {
  const { preferences, update } = usePreferences();
  return (
    <Group id="settings-appearance" icon="utilitySettings" title="Appearance and accessibility" description="Applies to every administration on this device and takes effect at once.">
      <Choice
        legend="Theme"
        layout="cards"
        value={preferences.theme ?? "system"}
        options={THEME_CHOICES.map((theme) => ({ value: theme, label: THEME[theme].label, detail: THEME[theme].detail }))}
        onChange={(theme) => update({ theme })}
      />
      <Toggle label="High contrast" checked={preferences.highContrast === true} onChange={(highContrast) => update({ highContrast })} hint="Stronger text, boundaries and selection outlines." />
      <Choice
        legend="Color-vision palette"
        layout="cards"
        value={preferences.colorVision ?? "standard"}
        options={COLOR_VISION_PALETTES.map((palette) => ({ value: palette, label: VISION[palette].label, detail: VISION[palette].detail }))}
        onChange={(colorVision) => update({ colorVision })}
      />
      <PaletteSample />
    </Group>
  );
}

function MapSettings() {
  const { preferences, update } = usePreferences();
  return (
    <Group id="settings-map" icon="mapPin" title="Map" description="How the map moves and how much it draws. Your system's reduce-motion setting always turns the camera to Cut.">
      <Choice
        legend="Camera"
        layout="cards"
        value={preferences.camera}
        options={CAMERA_MODES.map((mode) => ({ value: mode, label: CAMERA[mode].label, detail: CAMERA[mode].detail }))}
        onChange={(camera) => update({ camera })}
        hint={preferences.camera ? undefined : "Not chosen yet. The map uses Fly until your first administration and Quick after it."}
      />
      <Choice legend="Map density" value={preferences.mapDensity ?? "standard"} options={MAP_DENSITIES.map((density) => ({ value: density, label: DENSITY[density] }))} onChange={(mapDensity) => update({ mapDensity })} />
    </Group>
  );
}

/** First-run guidance: on until it is turned off here or from the walkthrough; turning it back on shows the walkthrough again. */
function Guidance() {
  const { preferences, update } = usePreferences();
  const shown = preferences.hideGuidance !== true && !(preferences.dismissedBriefs ?? []).includes(FIRST_RUN);
  return (
    <Toggle
      label="Show the first-run walkthrough"
      checked={shown}
      onChange={(on) => update(on ? { hideGuidance: false, dismissedBriefs: (preferences.dismissedBriefs ?? []).filter((id) => id !== FIRST_RUN) } : { hideGuidance: true })}
      hint="Four short steps on the briefing, comparison, navigation and maps, on the next decision you open."
    />
  );
}

/** The device's settings, grouped by what they change: appearance, the map, guidance, what pauses time, saves, and God Mode where it is held. */
function Settings() {
  return (
    <Screen icon="utilitySettings" title="Settings" eyebrow="This device" lede="Preferences are kept on this device and apply to every administration. Each change is saved as you make it." screenClass="workspace" camera="world">
      <div className="settings">
        <Appearance />
        <MapSettings />
        <Group id="settings-guidance" icon="review" title="Guidance" description="Help for a first presidency. Terms are always in search.">
          <Guidance />
        </Group>
        <Group id="settings-attention" icon="notificationStack" title="What pauses time" description="Choose when each kind of item interrupts you.">
          <AttentionSettings />
        </Group>
        <Group id="settings-saves" icon="folder" title="Saves" description="Saved on this device. Clearing this site's data deletes them in a browser, so export an administration you want to keep.">
          <p className="settings-links">
            <Link to="/administrations" className={buttonClass("secondary", "sm")}>
              Your administrations
            </Link>
            <Link to="/recovery" className={buttonClass("ghost", "sm")}>
              Save problems
            </Link>
          </p>
        </Group>
        <GodModeRow />
      </div>
    </Screen>
  );
}

export const Route = createFileRoute("/settings")({
  component: Settings,
});
