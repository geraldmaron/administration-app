import { CAMERA_MODES, MAP_DENSITIES, type CameraMode, type MapDensity } from "@admin/player-core";
import { ChoiceList, Segmented, Toggle } from "@admin/ui/forms";
import { usePreferences } from "../device/hooks";
import { SettingsGroup } from "./parts";

const CAMERA: Readonly<Record<CameraMode, { readonly label: string; readonly detail: string }>> = {
  fly: { label: "Fly", detail: "The map glides smoothly to each place." },
  quick: { label: "Quick", detail: "A quick slide to nearby places, and a glide only for faraway ones." },
  cut: { label: "Cut", detail: "No movement. The map jumps straight to each place." },
};

const DENSITY: Readonly<Record<MapDensity, string>> = { fine: "Fine", standard: "Standard", bold: "Bold" };

// The first-run walkthrough's brief id, shared with the walkthrough that
// dismisses it: turning guidance back on has to clear exactly that entry.
const FIRST_RUN = "first-decision";

export function MapSettings() {
  const { preferences, update } = usePreferences();
  return (
    <SettingsGroup icon="mapPin" title="Map" description="Choose how the map moves and how much detail it shows. If your device is set to reduce motion, the map always uses Cut.">
      <ChoiceList
        label="Camera"
        help={preferences.camera ? undefined : "You haven't picked one yet. The map uses Fly until you start your first presidency, then Quick after that."}
        minCardWidth={200}
        options={CAMERA_MODES.map((mode) => ({ value: mode, label: CAMERA[mode].label, detail: CAMERA[mode].detail }))}
        value={preferences.camera}
        onChange={(camera) => update({ camera })}
      />
      <Segmented label="Map detail" options={MAP_DENSITIES.map((density) => ({ value: density, label: DENSITY[density] }))} value={preferences.mapDensity ?? "standard"} onChange={(mapDensity) => update({ mapDensity })} />
    </SettingsGroup>
  );
}

/** First-run guidance: on until it is turned off here or from the walkthrough; turning it back on shows the walkthrough again. */
export function Guidance() {
  const { preferences, update } = usePreferences();
  const dismissed = preferences.dismissedBriefs ?? [];
  const shown = preferences.hideGuidance !== true && !dismissed.includes(FIRST_RUN);
  return (
    <SettingsGroup icon="review" title="Guidance" description="Tips for your first time playing. You can always look up a word with search.">
      <Toggle
        label="Show the first-time walkthrough"
        hint="Four short tips about the briefing, comparing choices, finding your way around, and maps. You'll see them the next time you open a decision."
        value={shown}
        onChange={(on) => update(on ? { hideGuidance: false, dismissedBriefs: dismissed.filter((id) => id !== FIRST_RUN) } : { hideGuidance: true })}
      />
    </SettingsGroup>
  );
}
