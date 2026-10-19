import type { ReactNode } from "react";
import { Modal, Pressable as RNPressable, ScrollView } from "react-native";
import { View, useMedia } from "@tamagui/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { veil } from "../theme/veil";

export type SheetProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly eyebrow?: string;
  readonly children: ReactNode;
  /** Wide sheets (a document, a comparison) take more of the desktop. */
  readonly wide?: boolean;
  /** Actions pinned at the foot, within the thumb's reach on a phone. */
  readonly footer?: ReactNode;
};

/**
 * A layer over the page that keeps the page in view behind it: a bottom
 * sheet on a phone, a drawer from the right on a tablet or desktop. It opens
 * on the target only, closes on the scrim, the close button or Escape, and
 * returns focus to what opened it (the platform modal does both).
 */
export function Sheet({ open, onClose, title, eyebrow, children, wide, footer }: SheetProps) {
  const media = useMedia();
  const insets = useSafeAreaInsets();
  const phone = Boolean(media.phone);
  return (
    // The platform modal is already the dialog (on the web it renders role="dialog" aria-modal), so it carries the name; a second dialog inside it would nest two.
    <Modal visible={open} transparent animationType={phone ? "slide" : "fade"} onRequestClose={onClose} statusBarTranslucent aria-label={title}>
      <View flex={1} flexDirection={phone ? "column" : "row"} justifyContent="flex-end">
        <RNPressable accessibilityLabel="Close" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: veil(0.55) }} />
        <View
          position="relative"
          zIndex={1}
          backgroundColor="surface"
          width={phone ? "100%" : wide ? 760 : 480}
          maxWidth="100%"
          height={phone ? undefined : "100%"}
          maxHeight={phone ? "90%" : "100%"}
          borderTopLeftRadius="sheet"
          borderTopRightRadius={phone ? "sheet" : 0}
          borderBottomLeftRadius={phone ? 0 : "sheet"}
          paddingBottom={phone ? insets.bottom : 0}
          paddingTop={phone ? 0 : insets.top}
          shadowColor="shadowColor"
          shadowOpacity={1}
          shadowRadius={24}
        >
          {phone ? <View alignSelf="center" width={40} height={5} borderRadius="pill" backgroundColor="borderColorStrong" marginTop="sm" /> : null}
          <Row between gap="md" padding="lg" paddingBottom="sm" top>
            <Column flex={1} gap="2xs">
              {eyebrow ? (
                <Text variant="eyebrow" tone="gold">
                  {eyebrow}
                </Text>
              ) : null}
              <Text variant="heading" role="heading" aria-level={2}>
                {title}
              </Text>
            </Column>
            <Button kind="quiet" icon="close" label="Close" onPress={onClose} />
          </Row>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}>
            {children}
          </ScrollView>
          {footer ? (
            <View padding="lg" borderTopWidth={1} borderTopColor="borderColor">
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
