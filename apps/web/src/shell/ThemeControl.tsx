import { THEME_CHOICES, type ThemeChoice } from "@admin/player-core";
import { Icon, Popover } from "@admin/ui-web";
import { usePreferences } from "../app/hooks";
import { THEME } from "../app/theme-words";

/** The three choices as pressed buttons; `onPicked` lets a menu close itself after a pick. */
export function ThemeSwitch({ onPicked }: { readonly onPicked?: (theme: ThemeChoice) => void }) {
  const { preferences, update } = usePreferences();
  const choice = preferences.theme ?? "system";
  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {THEME_CHOICES.map((theme) => (
        <button
          key={theme}
          type="button"
          className="theme-switch__option"
          aria-pressed={theme === choice}
          onClick={() => {
            update({ theme });
            onPicked?.(theme);
          }}
        >
          <Icon name={THEME[theme].icon} size={20} />
          <span>{THEME[theme].label}</span>
        </button>
      ))}
    </div>
  );
}

/** Theme changes use the same non-modal contextual layer as other display help. */
export function ThemeControl() {
  const { preferences } = usePreferences();
  const choice = preferences.theme ?? "system";
  return <Popover label={`Theme: ${THEME[choice].label}`} triggerClassName="bar-button bar-button--theme" trigger={<Icon name={THEME[choice].icon} size={20} />}>
    {(close) => <ThemeSwitch onPicked={close} />}
  </Popover>;
}
