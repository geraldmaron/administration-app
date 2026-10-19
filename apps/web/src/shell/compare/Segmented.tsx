import { useId } from "react";
import "./segmented.css";

export type SegmentOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  /** Said where the option cannot be picked, and why. */
  readonly unavailable?: string;
};

export type SegmentedProps<T extends string> = {
  readonly legend: string;
  readonly options: readonly SegmentOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
};

/** A short row of mutually exclusive modes, as one control: native radios, so the arrow keys move between them. */
export function Segmented<T extends string>({ legend, options, value, onChange }: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="seg">
      <legend className="seg__legend">{legend}</legend>
      <div className="seg__row">
        {options.map((option) => (
          <label key={option.value} className="seg__option" data-checked={option.value === value ? "true" : undefined} data-unavailable={option.unavailable ? "true" : undefined} title={option.unavailable}>
            <input type="radio" name={name} value={option.value} checked={option.value === value} disabled={option.unavailable !== undefined} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
            {option.unavailable ? <span className="ui-visually-hidden">, {option.unavailable}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
