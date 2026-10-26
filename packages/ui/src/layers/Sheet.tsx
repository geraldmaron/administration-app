import { useState, type ReactNode } from "react";
import { Modal, Pressable as RNPressable, ScrollView } from "react-native";
import { Theme, View, useMedia, useThemeName } from "@tamagui/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../primitives/Button";
import { Column, Row } from "../primitives/Stack";
import { Text } from "../primitives/Text";
import { pageThemeOf } from "../theme/from-design";
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
  /**
   * On a phone, open at half height with a button to take the full height and
   * back. The detent is a button, never a drag alone.
   */
  readonly detents?: boolean;
};

/**
 * A layer over the page that keeps the page in view behind it: a bottom
 * sheet on a phone, a drawer from the right on a tablet or desktop. It opens
 * on the target only, closes on the scrim, the close button or Escape, and
 * returns focus to what opened it (the platform modal does both).
 */
export function Sheet({ open, onClose, title, eyebrow, children, wide, footer, detents }: SheetProps) {
  const media = useMedia();
  const insets = useSafeAreaInsets();
  const phone = Boolean(media.phone);
  const [full, setFull] = useState(false);
  const half = phone && detents && !full;
  // The platform modal renders outside the page's themed tree on the web, so the page's theme is set again inside it, or a Night page opens a Day sheet.
  const theme = pageThemeOf(useThemeName());
  return (
    // The platform modal is already the dialog (on the web it renders role="dialog" aria-modal), so it carries the name; a second dialog inside it would nest two.
    <Modal visible={open} transparent animationType={phone ? "slide" : "fade"} onRequestClose={onClose} statusBarTranslucent aria-label={title}>
      <Theme name={theme as never} forceClassName>
        <View flex={1} flexDirection={phone ? "column" : "row"} justifyContent="flex-end">
        <RNPressable accessibilityLabel="Close" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: veil(0.55) }} />
        <View
          position="relative"
          zIndex={1}
          backgroundColor="surface"
          width={phone ? "100%" : wide ? 760 : 480}
          maxWidth="100%"
          height={phone ? undefined : "100%"}
          maxHeight={half ? "50%" : phone ? "90%" : "100%"}
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
            <Row gap="xs">
              {phone && detents ? <Button kind="quiet" icon={full ? "restorePanel" : "expandPanel"} label={full ? "Show less" : "Show more"} onPress={() => setFull(!full)} /> : null}
              <Button kind="quiet" icon="close" label="Close" onPress={onClose} />
            </Row>
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
      </Theme>
    </Modal>
  );
}
