import type { ComponentRef, ReactNode, Ref } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark, Column, Icon, Row, Text, View, useMedia, type IconName } from "@admin/ui";
import type { FoundingStageId } from "@admin/player-core";
import { ReturnButton } from "../settings/parts";

/** Each stage's mark, so a step is recognized before its title is read. */
export const STAGE_GLYPH: Readonly<Record<FoundingStageId, IconName>> = {
  person: "subjectPerson",
  record: "dossier",
  politics: "ballot",
  ticket: "election",
  platform: "domesticLedger",
  staff: "westWing",
  cabinet: "appoint",
  oath: "sign",
};

/** The measure every part of the transition shares, so the rail, the stage and the foot line up. */
export function Measure({ children }: { readonly children: ReactNode }) {
  return (
    <View width="100%" maxWidth={1240} alignSelf="center">
      {children}
    </View>
  );
}

/**
 * The transition's own frame, outside the game's: the office's mark and the
 * stage rail across the top, the stage scrolling under it, and the actions
 * held at the foot, where a thumb reaches them on a phone.
 */
export function FoundingFrame({ rail, footer, scroller, children }: { readonly rail?: ReactNode; readonly footer?: ReactNode; readonly scroller?: Ref<ComponentRef<typeof ScrollView>>; readonly children: ReactNode }) {
  const media = useMedia();
  const insets = useSafeAreaInsets();
  const pad = media.phone ? "lg" : "2xl";
  return (
    <View flex={1} backgroundColor="background">
      <View paddingTop={insets.top} borderBottomWidth={1} borderBottomColor="borderColor" backgroundColor="surface">
        <View paddingTop={media.phone ? "sm" : "lg"} paddingBottom="sm" paddingHorizontal={pad}>
          <Measure>
            <Column gap="sm">
              <Row gap="sm">
                <BrandMark size={28} tone="color" />
                <Text variant="eyebrow" tone="gold" flex={1}>
                  Getting ready to take office
                </Text>
                <ReturnButton label="Leave" />
              </Row>
              {rail}
            </Column>
          </Measure>
        </View>
      </View>
      <ScrollView ref={scroller} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <View paddingHorizontal={pad} paddingTop={media.phone ? "lg" : "2xl"} paddingBottom="3xl">
          <Measure>{children}</Measure>
        </View>
      </ScrollView>
      {footer ? (
        <View paddingBottom={insets.bottom} borderTopWidth={1} borderTopColor="borderColorStrong" backgroundColor="surfaceRaised" shadowColor="shadowColor" shadowOpacity={1} shadowRadius={16}>
          <View paddingHorizontal={pad} paddingTop="sm" paddingBottom="md">
            <Measure>{footer}</Measure>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A stage's identity: its mark, where it sits in the sequence, its title and the one question it asks. */
export function StageHero({ stage, eyebrow, title, question, tools }: { readonly stage: FoundingStageId; readonly eyebrow: string; readonly title: string; readonly question: string; readonly tools?: ReactNode }) {
  const media = useMedia();
  return (
    <Row gap="lg" top wrap marginBottom={media.phone ? "lg" : "2xl"}>
      <View width={media.phone ? 52 : 72} height={media.phone ? 52 : 72} borderRadius="pill" backgroundColor="goldFill" alignItems="center" justifyContent="center">
        <Icon name={STAGE_GLYPH[stage]} size={media.phone ? 28 : 40} tone="goldInk" weight="fill" />
      </View>
      <Column gap="2xs" flex={1} minWidth={220}>
        <Text variant="eyebrow" tone="gold" tabular>
          {eyebrow}
        </Text>
        <Text variant={media.phone ? "heading" : "display"} role="heading" aria-level={1}>
          {title}
        </Text>
        <Text variant="title" serif weight="regular" tone="secondary" fontStyle="italic">
          {question}
        </Text>
      </Column>
      {tools ? <Row gap="xs" wrap>{tools}</Row> : null}
    </Row>
  );
}
