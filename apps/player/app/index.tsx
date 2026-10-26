import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { formatDate, vaultCapacity, type CampaignState } from "@admin/player-core";
import { BrandMark, Button, CardLink, Column, Icon, Row, Surface, Text, Theme, View, useMedia, veil } from "@admin/ui";
import { useCampaignState, useStoresIfReady } from "../src/device/hooks";
import { Haiku } from "../src/title/Haiku";
import { WorldPlate } from "../src/title/WorldPlate";

function useSlotsUsed(): number | undefined {
  const store = useStoresIfReady();
  const state = useCampaignState();
  const [used, setUsed] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!store) return;
    let canceled = false;
    store.saves.list().then(
      (library) => !canceled && setUsed(library.campaigns.length),
      (cause: unknown) => console.warn("The library could not be listed on the title screen.", cause),
    );
    return () => {
      canceled = true;
    };
  }, [store, state.status]);
  return used;
}

function Resume({ state }: { readonly state: Extract<CampaignState, { status: "ready" }> }) {
  const { campaign } = state;
  return (
    <CardLink level="raised" pad="lg" accentEdge="gold" elevated label={`Continue your presidency as President ${campaign.founding.leader.name}`} onPress={() => router.push("/brief")}>
      <Column gap="xs">
        <Text variant="eyebrow" tone="gold">
          Resume
        </Text>
        <Text variant="heading">President {campaign.founding.leader.name}</Text>
        <Text variant="label" tone="secondary">
          {formatDate(campaign.calendar)} · Week {campaign.turn}
        </Text>
        <Row gap="xs" marginTop="md">
          <Icon name="brief" size={18} tone="accent" />
          <Text variant="label" tone="accent">
            Continue your presidency
          </Text>
          <Icon name="chevron" size={16} tone="accent" />
        </Row>
      </Column>
    </CardLink>
  );
}

function Doors({ used, ready, leading }: { readonly used: number | undefined; readonly ready: boolean; readonly leading: boolean }) {
  const capacity = vaultCapacity(used ?? 0);
  return (
    <Column gap="sm">
      <Link href="/founding" asChild disabled={!ready}>
        <Button kind={leading ? "secondary" : "seal"} icon="sign" disabled={!ready} block>
          Start a new presidency
        </Button>
      </Link>
      {used !== undefined && capacity.full ? (
        <Text variant="caption" tone="secondary">
          All {capacity.limit} save slots are full. When you take the oath, you'll pick one to replace.
        </Text>
      ) : null}
      <Row gap="sm" wrap>
        <Link href="/administrations" asChild>
          <Button kind="quiet" icon="archive">
            {`Your administrations${used !== undefined ? ` (${used} of ${capacity.limit})` : ""}`}
          </Button>
        </Link>
        <Link href="/handbook" asChild>
          <Button kind="quiet" icon="info">
            Handbook
          </Button>
        </Link>
        <Link href="/settings" asChild>
          <Button kind="quiet" icon="utilitySettings">
            Settings
          </Button>
        </Link>
      </Row>
    </Column>
  );
}

/** The title: the Oval Office at night, the office's name and the doors into the game. */
export default function Title() {
  const state = useCampaignState();
  const store = useStoresIfReady();
  const used = useSlotsUsed();
  const media = useMedia();
  const resuming = state.status === "ready";
  return (
    <Theme name="dark">
      <View flex={1} backgroundColor="backgroundStrong">
        <View position="absolute" top={0} left={0} right={0} bottom={0}>
          <WorldPlate focus={media.phone ? "americas" : "world"} />
        </View>
        <LinearGradient
          colors={[veil(0), veil(0.55), veil(0.94)]}
          locations={[0.35, 0.68, 1]}
          style={{ position: "absolute", inset: 0 }}
        />
        <LinearGradient
          colors={[veil(0.85), veil(0)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
          <Column
            gap="xl"
            padding={media.phone ? "lg" : "3xl"}
            paddingBottom={media.phone ? "2xl" : "3xl"}
            maxWidth={560}
            width="100%"
          >
            <Column gap="sm">
              <BrandMark size={56} tone="color" />
              <Text variant="eyebrow" tone="gold">
                The United States of America
              </Text>
              <Text variant="hero" role="heading">
                Office of the President
              </Text>
              <Text variant="title" tone="secondary" weight="regular">
                You're the President of the United States. Lead the country in a world of 196 governments, one decision at a time.
              </Text>
              <Haiku id="title-welcome" />
            </Column>
            {state.status === "loading" ? (
              <Text variant="label" tone="secondary">
                Opening your saves…
              </Text>
            ) : null}
            {state.status === "failed" ? (
              <Surface level="raised" accentEdge="danger">
                <Column gap="sm">
                  <Text variant="title">We couldn't open your presidency</Text>
                  <Text variant="body" tone="secondary">
                    Your save is still there, and we didn't replace it with a blank one. You can try again, or go to the recovery page for more help.
                  </Text>
                  <Text variant="label" tone="danger" role="alert">
                    {state.message}
                  </Text>
                  <Row gap="sm" wrap>
                    <Button kind="primary" onPress={() => void store?.restore()}>
                      Try again
                    </Button>
                    <Link href="/recovery" asChild>
                      <Button kind="secondary" icon="return">
                        Get help with saves
                      </Button>
                    </Link>
                  </Row>
                </Column>
              </Surface>
            ) : null}
            {resuming ? <Resume state={state} /> : null}
            <Doors used={used} ready={state.status !== "loading" && used !== undefined} leading={resuming} />
          </Column>
        </ScrollView>
      </View>
    </Theme>
  );
}
