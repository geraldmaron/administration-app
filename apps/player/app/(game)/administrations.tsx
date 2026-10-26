import { Link } from "expo-router";
import { vaultCapacity, type CampaignLibrary } from "@admin/player-core";
import { Button, Column, Empty, ErrorState, Loading, Page, Section, Surface, Text, type IconName } from "@admin/ui";
import { SAVE_FILES_SUPPORTED } from "../../src/library/save-file";
import { SaveCard } from "../../src/library/SaveCard";
import { useLibrary, type LibraryActions } from "../../src/library/use-library";
import { Notice, PageBack } from "../../src/settings/parts";

function Part({ id, icon, title, children }: { readonly id: string; readonly icon: IconName; readonly title: string; readonly children: React.ReactNode }) {
  return (
    <Section id={id} icon={icon} title={title}>
      <Column gap="md">{children}</Column>
    </Section>
  );
}

function NoSaves({ title }: { readonly title: string }) {
  return (
    <Surface level="sunken">
      <Empty title={title} detail={`You can start one below${SAVE_FILES_SUPPORTED ? ", or import a save you exported earlier" : ""}.`} icon="emptyInbox" />
    </Surface>
  );
}

function Saved({ library, actions }: { readonly library: CampaignLibrary; readonly actions: LibraryActions }) {
  const { activeCampaignId, campaigns } = library;
  const active = campaigns.find((summary) => summary.id === activeCampaignId && summary.status === "healthy");
  const others = campaigns.filter((summary) => summary !== active);
  return (
    <>
      {active ? (
        <Part id="playing" icon="archive" title="The presidency you're playing now">
          <Column role="list">
            <SaveCard summary={active} active actions={actions} />
          </Column>
        </Part>
      ) : null}
      <Part id="saved" icon="folder" title={active ? "Other saved presidencies" : "Saved presidencies"}>
        {others.length > 0 ? (
          <Column gap="md" role="list">
            {others.map((summary) => (
              <SaveCard key={summary.id} summary={summary} active={false} actions={actions} />
            ))}
          </Column>
        ) : (
          <NoSaves title={active ? "No other presidencies are saved" : "No presidencies are saved on this device yet"} />
        )}
      </Part>
    </>
  );
}

function Unavailable({ retry }: { readonly retry: () => void }) {
  return (
    <Surface level="raised" accentEdge="danger">
      <ErrorState title="We couldn't open your saves" detail="Nothing was removed or replaced. Make sure your browser lets this site store data, and close any other tabs with this game open, since they can keep the saves locked." action={{ label: "Try again", icon: "review", onPress: retry }} />
    </Surface>
  );
}

function Add({ library, busy, importSave }: { readonly library: CampaignLibrary | null; readonly busy: boolean; readonly importSave: () => void }) {
  const capacity = vaultCapacity(library?.campaigns.length ?? 0);
  return (
    <Part id="add" icon="sign" title="Add a presidency">
      {!library ? (
        <Button disabled>Your saves need to open before you can start</Button>
      ) : (
        <Column gap="xs">
          <Link href="/founding" asChild>
            <Button kind="seal" icon="sign">
              Start a new presidency
            </Button>
          </Link>
          {capacity.full ? (
            <Text variant="caption" tone="secondary">
              All {capacity.limit} save slots are full. When you take the oath, you'll pick one to replace, and you can save a copy of it first.
            </Text>
          ) : null}
        </Column>
      )}
      {SAVE_FILES_SUPPORTED ? (
        <Column gap="xs">
          <Button icon="folder" disabled={busy || !library} onPress={importSave}>
            Import a save file
          </Button>
          <Text variant="caption" tone="secondary">
            {capacity.full ? "All save slots are full, so you'll pick one to replace before it opens." : "It opens in an empty save slot."}
          </Text>
        </Column>
      ) : null}
    </Part>
  );
}

/** The saves on this device: the one in play first, then the rest, with every action the store supports. */
export default function Administrations() {
  const { library, error, notice, busy, reading, retry, actions, importSave, roomSheet } = useLibrary();
  const capacity = vaultCapacity(library?.campaigns.length ?? 0);
  return (
    <Page
      icon="archive"
      eyebrow="Saved on this device"
      title="Your administrations"
      {...(library ? { lede: `${capacity.used} of ${capacity.limit} save slots are in use.` } : {})}
      actions={<PageBack />}
      testID="administrations"
    >
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      {library ? (
        <Saved library={library} actions={actions} />
      ) : reading ? (
        <Loading title="Looking at the saves on this device" />
      ) : (
        <Unavailable retry={retry} />
      )}
      <Add library={library} busy={busy} importSave={importSave} />
      {roomSheet}
    </Page>
  );
}
