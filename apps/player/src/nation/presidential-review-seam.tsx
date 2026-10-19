import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button, Column, Row, Sheet, Surface, Text } from "@admin/ui";

// Every Nation and Compare act is put to the President through this one hook,
// which keeps the rule: the terms the screen showed, then a separate
// confirmation naming the act. A shared review component would replace this
// file's body without changing any caller.

export type ReviewLine = { readonly label: string; readonly value: string };

export type ReviewSpec = {
  /** `full` for an act that binds the country; `confirm` for a routine one. Both require the named confirmation. */
  readonly tier: "full" | "confirm";
  /** The act, as the screen offered it. */
  readonly title: string;
  readonly lines?: readonly ReviewLine[];
  /** The final control's words; "Confirm" when absent. */
  readonly verb?: string;
  /** Forceful or irreversible: the final control is drawn as danger. */
  readonly danger?: boolean;
};

type Pending = { readonly spec: ReviewSpec; readonly resolve: (confirmed: boolean) => void };

/** Opens the review for one act and resolves true only on its named confirmation. */
export function usePresidentialReview(): { readonly open: (spec: ReviewSpec) => Promise<boolean>; readonly layer: ReactNode } {
  const [pending, setPending] = useState<Pending | undefined>(undefined);
  const current = useRef<Pending | undefined>(undefined);
  const settle = useCallback((confirmed: boolean) => {
    current.current?.resolve(confirmed);
    current.current = undefined;
    setPending(undefined);
  }, []);
  const open = useCallback((spec: ReviewSpec) => {
    current.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { spec, resolve };
      current.current = next;
      setPending(next);
    });
  }, []);
  const spec = pending?.spec;
  const layer = (
    <Sheet
      open={spec !== undefined}
      onClose={() => settle(false)}
      eyebrow={spec?.tier === "full" ? "Presidential review" : "Confirm"}
      title={spec?.title ?? ""}
      footer={
        <Row gap="sm" wrap>
          <Button kind="secondary" onPress={() => settle(false)}>
            Go back
          </Button>
          <Button kind={spec?.danger ? "danger" : "primary"} icon="sign" onPress={() => settle(true)}>
            {spec?.verb ?? "Confirm"}
          </Button>
        </Row>
      }
    >
      <Column gap="md">
        {spec?.lines?.length ? (
          <Surface level="raised" pad="md">
            <Column gap="xs">
              {spec.lines.map((line) => (
                <Row key={line.label} gap="md" top wrap>
                  <Text variant="label" tone="secondary" width={160}>
                    {line.label}
                  </Text>
                  <Text variant="body" flex={1} minWidth={160}>
                    {line.value}
                  </Text>
                </Row>
              ))}
            </Column>
          </Surface>
        ) : null}
        <Text variant="body" tone="secondary">
          Nothing happens until you confirm. When you do, it takes effect right away, based on how things stand now, and it goes on your Record.
        </Text>
      </Column>
    </Sheet>
  );
  return { open, layer };
}
