import { Link } from "expo-router";
import { Button, Page, Row } from "@admin/ui";
import { Appearance } from "../../src/settings/Appearance";
import { AttentionSettings } from "../../src/settings/AttentionSettings";
import { GodModeRow } from "../../src/settings/GodModeRow";
import { Guidance, MapSettings } from "../../src/settings/MapAndGuidance";
import { PageBack, SettingsGroup } from "../../src/settings/parts";
import { isDevelopmentBuild } from "../../src/shell/build-flavor";

/** The device's settings, grouped by what they change: appearance, the map, guidance, what pauses time, saves, and God Mode where it is held. */
export default function Settings() {
  return (
    <Page icon="utilitySettings" eyebrow="This device" title="Settings" lede="These apply to every presidency on this device, and each change is already saved." actions={<PageBack />} testID="settings">
      <Appearance />
      <MapSettings />
      <Guidance />
      <AttentionSettings />
      <SettingsGroup icon="folder" title="Saves" description="Your saves live on this device. In a browser, clearing this site's data deletes them, so export any presidency you want to keep.">
        <Row gap="sm" wrap>
          <Link href="/administrations" asChild>
            <Button icon="archive">Your administrations</Button>
          </Link>
        </Row>
      </SettingsGroup>
      <GodModeRow />
      {isDevelopmentBuild ? (
        <SettingsGroup icon="dossier" title="Design system" description="A page for the people who build the game. It shows every piece of the screen in each of its states. It isn't part of the game.">
          <Row gap="sm" wrap>
            <Link href="/catalog" asChild>
              <Button kind="quiet" icon="open">
                Design system catalog
              </Button>
            </Link>
          </Row>
        </SettingsGroup>
      ) : null}
    </Page>
  );
}
