import { NativeSelect } from "./NativeSelect";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";

export type FieldControlProps = {
  readonly id: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: true;
};

export type FieldProps = {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** A refusal the player can act on. It is announced and links to the control. */
  readonly error?: ReactNode;
  readonly className?: string;
  /** The control, handed the id and description it must carry. */
  readonly children: (control: FieldControlProps) => ReactNode;
};

/** A label, the control it names, and the hint and error that describe it. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div className={["ui-field", className].filter(Boolean).join(" ")} data-invalid={error ? "true" : undefined}>
      <LabelPrimitive.Root className="ui-field__label" htmlFor={id}>
        {label}
      </LabelPrimitive.Root>
      {children({ id, ...(describedBy ? { "aria-describedby": describedBy } : {}), ...(error ? { "aria-invalid": true as const } : {}) })}
      {hint ? (
        <p id={hintId} className="ui-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="ui-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type ChoiceOption<T extends string> = {
  readonly value: T;
  readonly label: ReactNode;
  /** One line under the label: what choosing it means. */
  readonly detail?: ReactNode;
  /** What the option looks like: a picture above the label in `tiles`. */
  readonly visual?: ReactNode;
  /** The color the option is, for `swatches`; the label stays its accessible name. */
  readonly swatch?: string;
};

export type ChoiceProps<T extends string> = {
  readonly legend: ReactNode;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T | undefined;
  readonly onChange: (value: T) => void;
  readonly hint?: ReactNode;
  /**
   * `segments` for a short row of words; `cards` for options with a detail
   * line; `tiles` for options shown as what they look like; `swatches` for a
   * row of colors.
   */
  readonly layout?: "segments" | "cards" | "tiles" | "swatches";
  readonly className?: string;
  readonly appearance?: "plain" | "outline";
};

/** Measure the actual labels, including font/zoom changes, before choosing a compact control. */
function useCompactChoice(enabled: boolean, options: readonly ChoiceOption<string>[]) {
  const row = useRef<HTMLDivElement>(null);
  const select = useRef<HTMLSelectElement>(null);
  const [compact, setCompact] = useState(false);
  const transferFocus = useRef(false);
  useLayoutEffect(() => {
    const element = row.current;
    if (!enabled || !element) return;
    const measure = () => {
      const next = element.scrollWidth > element.clientWidth + 1;
      transferFocus.current = element.contains(document.activeElement) || document.activeElement === select.current;
      setCompact(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const label of element.querySelectorAll('.ui-choice__label')) observer.observe(label);
    return () => observer.disconnect();
  }, [enabled, options]);
  useLayoutEffect(() => {
    if (!transferFocus.current) return;
    if (compact) select.current?.focus({ preventScroll: true });
    else {
      const options = row.current;
      (options?.querySelector<HTMLInputElement>('input:checked') ?? options?.querySelector<HTMLInputElement>('input:not(:disabled)'))?.focus({ preventScroll: true });
    }
    transferFocus.current = false;
  }, [compact]);
  return { row, select, compact: enabled && compact };
}

/** Segments remain one row; when the labels do not fit, the same choice uses a native select. */
export function Choice<T extends string>({ legend, options, value, onChange, hint, layout = "segments", className, appearance = "plain" }: ChoiceProps<T>) {
  const name = useId();
  const { row, select, compact } = useCompactChoice(layout === "segments" && options.every((option) => typeof option.label === "string"), options);
  return (
    <fieldset className={["ui-choice", `ui-choice--${layout}`, className].filter(Boolean).join(" ")} data-compact={compact || undefined} data-appearance={appearance}>
      <legend id={`${name}-legend`} className="ui-field__label">{legend}</legend>
      {hint ? <p id={`${name}-hint`} className="ui-field__hint">{hint}</p> : null}
      {compact ? <NativeSelect ref={select} aria-labelledby={`${name}-legend`} aria-describedby={hint ? `${name}-hint` : undefined} value={value ?? ""} onChange={(event) => onChange(event.target.value as T)}>
        {value === undefined ? <option value="" disabled>Choose an option</option> : null}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </NativeSelect> : null}
      <div ref={row} className="ui-choice__options" aria-hidden={compact || undefined} inert={compact || undefined}>
        {options.map((option) => (
          <label key={option.value} className="ui-choice__option" data-checked={option.value === value ? "true" : undefined} title={layout === "swatches" && typeof option.label === "string" ? option.label : undefined}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value as T)}
            />
            {option.swatch ? <span className="ui-choice__swatch" style={{ background: option.swatch }} aria-hidden="true" /> : null}
            {option.visual ? <span className="ui-choice__visual" aria-hidden="true">{option.visual}</span> : null}
            <span className={layout === "swatches" ? "ui-choice__label ui-visually-hidden" : "ui-choice__label"}>{option.label}</span>
            {option.detail ? <span className="ui-choice__detail">{option.detail}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type ToggleProps = {
  readonly label: ReactNode;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly hint?: ReactNode;
};

/** An on-off setting, as a switch a screen reader announces as one. */
export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  const id = useId();
  return (
    <div className="ui-toggle">
      <SwitchPrimitive.Root id={id} className="ui-switch" checked={checked} onCheckedChange={onChange} aria-describedby={hint ? `${id}-hint` : undefined}><SwitchPrimitive.Thumb className="ui-switch__thumb" /></SwitchPrimitive.Root>
      <LabelPrimitive.Root htmlFor={id} className="ui-toggle__label">{label}</LabelPrimitive.Root>
      {hint ? (
        <p id={`${id}-hint`} className="ui-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
