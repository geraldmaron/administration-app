import { Redirect, useLocalSearchParams } from "expo-router";
import { place } from "@admin/player-core";
import { Button, Page, Row } from "@admin/ui";
import { go } from "../../../../src/decision/parts";

/** Every reading lives on the screen that owns it; old links land there, and only an id the game does not keep stays here. */
export default function MetricPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const home = place.metric(id);
  if (!home.startsWith("/brief/metric/")) return <Redirect href={home as never} />;
  return (
    <Page icon="graph" eyebrow="A number" title="We couldn't find this number" lede="The game doesn't track a number by this name. It may come from an old link.">
      <Row>
        <Button kind="secondary" icon="brief" onPress={() => go(place.brief())}>
          Back to the Brief
        </Button>
      </Row>
    </Page>
  );
}
