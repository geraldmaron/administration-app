import { useRef, useState, type ReactNode } from "react";
import { Modal, Pressable as RNPressable, useWindowDimensions } from "react-native";
import { View, useMedia } from "@tamagui/core";
import { Button, Pressable } from "../primitives/Button";
import { Surface } from "../primitives/Surface";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { veil } from "../theme/veil";

const WIDTH = 320;
const EDGE = 8;

type Anchor = { readonly x: number; readonly y: number; readonly height: number };
type Measurable = { measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void };
type PressEvent = { stopPropagation?: () => void } | undefined;

export type PeekProps = {
  /** The name as the row prints it; pressing it opens the peek instead of the row's door. */
  readonly name: string;
  /** A face or an emblem, drawn at the card's head. */
  readonly identity?: ReactNode;
  /** One line under the name: the office, the seat, the role. */
  readonly role?: string;
  /** One or two standing readings, drawn small. */
  readonly readings?: ReactNode;
  /** Opens the subject's file; the screen owns the route. */
  readonly onOpen: () => void;
  readonly openLabel?: string;
};

/** Where the card sits: under the name, kept inside the window. */
function place(anchor: Anchor | undefined, window: { readonly width: number }): { readonly left: number; readonly top: number } {
  if (!anchor) return { left: EDGE, top: EDGE };
  return { left: Math.max(EDGE, Math.min(anchor.x, window.width - WIDTH - EDGE)), top: anchor.y + anchor.height + 4 };
}

/** The card itself: identity, role, readings and the door to the file. */
function PeekCard({ name, identity, role, readings, openLabel, onClose, onOpen }: Omit<PeekProps, "openLabel"> & { readonly openLabel: string; readonly onClose: () => void }) {
  return (
    <Surface level="raised" pad="md" elevated>
      <Column gap="sm">
        <Row gap="sm" top>
          {identity}
          <Column flex={1} minWidth={0} gap="2xs">
            <Text variant="body" weight="medium">
              {name}
            </Text>
            {role ? (
              <Text variant="caption" tone="secondary">
                {role}
              </Text>
            ) : null}
          </Column>
          <Button kind="quiet" size="compact" icon="close" label="Close" onPress={onClose} />
        </Row>
        {readings}
        <Button
          kind="secondary"
          size="compact"
          iconAfter="chevron"
          onPress={() => {
            onClose();
            onOpen();
          }}
        >
          {openLabel}
        </Button>
      </Column>
    </Surface>
  );
}

/**
 * A quick look at a person or body named inside a row that is itself a door:
 * their face or emblem, their role, a reading or two, and the way into their
 * file, without leaving the row. It opens under the name (at the foot of the
 * screen on a phone), closes on Escape, a press outside or the system back,
 * and the platform modal returns focus to the name.
 */
export function Peek({ name, identity, role, readings, onOpen, openLabel = "Open file" }: PeekProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>();
  const ref = useRef<Measurable>(null);
  const media = useMedia();
  const window = useWindowDimensions();
  const show = (event: PressEvent) => {
    event?.stopPropagation?.();
    const target = ref.current;
    if (target?.measureInWindow) target.measureInWindow((x, y, _width, height) => setAnchor({ x, y, height }));
    setOpen(true);
  };
  const at = place(anchor, window);
  return (
    <>
      <Pressable ref={ref as never} onPress={show} aria-haspopup="dialog" aria-expanded={open} aria-label={`${name}: quick look`} borderRadius="chip" paddingHorizontal="2xs" alignSelf="flex-start">
        <Text variant="label" textDecorationLine="underline" textDecorationStyle="dotted">
          {name}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <RNPressable accessibilityLabel="Close" onPress={() => setOpen(false)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: media.phone ? veil(0.4) : "transparent" }} />
        <View position="absolute" {...(media.phone ? { left: EDGE, right: EDGE, bottom: EDGE } : { left: at.left, top: at.top, width: WIDTH })} role="dialog" aria-label={name}>
          <PeekCard name={name} identity={identity} role={role} readings={readings} openLabel={openLabel} onClose={() => setOpen(false)} onOpen={onOpen} />
        </View>
      </Modal>
    </>
  );
}
