import { useCallback, useRef, useState, type ReactNode } from "react";
import { authorityByCite } from "@admin/player-core";
import { Button, Column, LegalCitation, Row, Sheet, Surface, Text } from "@admin/ui";
import { useOpenAuthority } from "../law/AuthorityProvider";

export type ReviewLine = { readonly label: string; readonly value: string };

/** How an act is put to the President before it is committed: the terms the screen showed, never the built outcome. */
export type ReviewSpec = {
  readonly title: string;
  readonly lines: readonly ReviewLine[];
  /** The final control's words: "Veto the bill", "Confirm the withdrawal". */
  readonly verb: string;
  readonly danger?: boolean;
  /** The citation the act rests on, shown on the review so the President signs knowing the authority. */
  readonly authority?: string;
};

type Pending = { readonly spec: ReviewSpec; readonly resolve: (confirmed: boolean) => void };

/**
 * The seat the shared presidential review fills (DECISIONS §8.9). Until the
 * review in `@admin/ui/review` is wired here, `presentForReview` opens a
 * sheet with the act's terms, its authority and one named confirmation; it
 * resolves true only on that confirmation. Every act on the Congress, courts
 * and oversight screens passes through this one function.
 */
export function useReviewSeat(): { readonly presentForReview: (spec: ReviewSpec) => Promise<boolean>; readonly reviewSheet: ReactNode } {
  const [pending, setPending] = useState<Pending | undefined>(undefined);
  const settled = useRef(false);
  const openAuthority = useOpenAuthority();
  const presentForReview = useCallback(
    (spec: ReviewSpec) =>
      new Promise<boolean>((resolve) => {
        settled.current = false;
        setPending({ spec, resolve });
      }),
    [],
  );
  const finish = (confirmed: boolean) => {
    if (!pending || settled.current) return;
    settled.current = true;
    pending.resolve(confirmed);
    setPending(undefined);
  };
  const spec = pending?.spec;
  const record = spec?.authority ? authorityByCite(spec.authority) : undefined;
  const reviewSheet = (
    <Sheet
      open={spec !== undefined}
      onClose={() => finish(false)}
      title={spec?.title ?? ""}
      eyebrow="Presidential review"
      footer={
        <Row gap="sm" wrap>
          <Button kind="secondary" icon="return" onPress={() => finish(false)}>
            Go back without acting
          </Button>
          <Button kind={spec?.danger ? "danger" : "primary"} icon="sign" onPress={() => finish(true)}>
            {spec?.verb ?? "Confirm"}
          </Button>
        </Row>
      }
    >
      {spec ? (
        <Column gap="md">
          <Surface level="raised" pad="md">
            <Column gap="sm">
              {spec.lines.map((line) => (
                <Column key={`${line.label}:${line.value}`} gap="2xs">
                  <Text variant="eyebrow" tone="secondary">
                    {line.label}
                  </Text>
                  <Text variant="body">{line.value}</Text>
                </Column>
              ))}
            </Column>
          </Surface>
          {spec.authority ? (
            <Column gap="xs">
              <Text variant="eyebrow" tone="secondary">
                The law behind this
              </Text>
              <LegalCitation citation={{ cite: spec.authority, title: record?.title ?? spec.authority }} onPress={() => openAuthority(spec.authority!)} />
            </Column>
          ) : null}
          <Text variant="caption" tone="secondary">
            Nothing happens until you confirm. If something changes first, like the week ending or another decision going through, this one won't go through. That way you never pay a cost you didn't see.
          </Text>
        </Column>
      ) : null}
    </Sheet>
  );
  return { presentForReview, reviewSheet };
}
