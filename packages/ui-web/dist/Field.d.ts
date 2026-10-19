import { type ReactNode } from "react";
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
export declare function Field({ label, hint, error, className, children }: FieldProps): import("react").JSX.Element;
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
/** Segments remain one row; when the labels do not fit, the same choice uses a native select. */
export declare function Choice<T extends string>({ legend, options, value, onChange, hint, layout, className, appearance }: ChoiceProps<T>): import("react").JSX.Element;
export type ToggleProps = {
    readonly label: ReactNode;
    readonly checked: boolean;
    readonly onChange: (checked: boolean) => void;
    readonly hint?: ReactNode;
};
/** An on-off setting, as a switch a screen reader announces as one. */
export declare function Toggle({ label, checked, onChange, hint }: ToggleProps): import("react").JSX.Element;
