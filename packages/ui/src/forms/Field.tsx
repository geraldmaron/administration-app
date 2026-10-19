import { useId, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";

/** What a control inside a field needs to be announced with its label, help and error. */
export type FieldControl = {
  readonly id: string;
  readonly "aria-labelledby": string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean;
  readonly "aria-required"?: boolean;
};

export type FieldProps = {
  readonly label: string;
  /** One sentence on what the value changes, under the label. */
  readonly help?: string;
  /** Present when the value is refused; said in words, never by color alone. */
  readonly error?: string;
  readonly required?: boolean;
  /** Something read beside the label, such as the current value of a slider. */
  readonly aside?: ReactNode;
  readonly children: (control: FieldControl) => ReactNode;
};

/**
 * A labeled control: the label above, the help under it, the control, then
 * the refusal if there is one. The control is handed the ids that tie the
 * three together, so a screen reader reads them as one field.
 */
export function Field({ label, help, error, required, aside, children }: FieldProps) {
  const base = useId();
  const labelId = `${base}-label`;
  const helpId = help ? `${base}-help` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <Column gap="xs">
      <Row between gap="sm">
        <Text variant="label" id={labelId}>
          {label}
          {required ? (
            <Text variant="label" tone="secondary" weight="regular">
              {" "}
              (required)
            </Text>
          ) : null}
        </Text>
        {aside}
      </Row>
      {help ? (
        <Text variant="caption" tone="secondary" id={helpId}>
          {help}
        </Text>
      ) : null}
      {children({
        id: `${base}-control`,
        "aria-labelledby": labelId,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true } : {}),
        ...(required ? { "aria-required": true } : {}),
      })}
      {error ? (
        <Row gap="xs" top>
          <Icon name="caution" size={16} tone="danger" weight="bold" />
          <Text variant="caption" tone="danger" id={errorId} role="alert" flex={1}>
            {error}
          </Text>
        </Row>
      ) : null}
    </Column>
  );
}

/** A group's legend and help, for controls that are a set of options rather than one input. */
export function Legend({ id, label, help }: { readonly id: string; readonly label: string; readonly help?: string }) {
  return (
    <Column gap="2xs">
      <Text variant="label" id={id}>
        {label}
      </Text>
      {help ? (
        <Text variant="caption" tone="secondary">
          {help}
        </Text>
      ) : null}
    </Column>
  );
}
