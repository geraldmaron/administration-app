import { useState, type ReactNode } from "react";
import { router } from "expo-router";
import type { CampaignLibrary } from "@admin/player-core";
import { Button, Column, Icon, Page, Row, Surface, Tag, Text } from "@admin/ui";
import { Receipt } from "@admin/ui/review";
import { useCampaignState, useSaveState, useStoresIfReady } from "../src/device/hooks";
import { SaveCard } from "../src/library/SaveCard";
import { useLibrary, type LibraryActions } from "../src/library/use-library";
import { Notice, ReturnButton } from "../src/settings/parts";

const words = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

function Step({ icon, title, children }: { readonly icon: "sign" | "archive" | "caution"; readonly title: string; readonly children: ReactNode }) {
  return (
    <Surface role="region" aria-label={title}>
      <Column gap="md">
        <Row gap="sm">
          <Icon name={icon} size={22} tone="gold" />
          <Text variant="title" role="heading" aria-level={2}>{title}</Text>
        </Row>
        {children}
      </Column>
    </Surface>
  );
}

/** What this device could and could not read, said plainly before any option, so nothing unread passes for empty. */
function Reasons({ failed, library, listError }: { readonly failed: string | undefined; readonly library: CampaignLibrary | null; readonly listError: string | null }) {
  const save = useSaveState();
  const lines = [
    failed ? `We couldn't open the presidency you were playing: ${failed}` : undefined,
    save.status === "failed" ? `The last save didn't go through: ${save.error ?? "this device wouldn't store it"}.` : undefined,
    library === null && listError ? `We couldn't read the list of your saved presidencies: ${listError}` : undefined,
  ].filter((line): line is string => line !== undefined);
  if (lines.length === 0) return <Notice tone="info">Everything looks fine. This device read all your saves and kept the most recent one.</Notice>;
  return (
    <Surface level="raised" accentEdge="danger" role="alert">
      <Column gap="sm">
        <Text variant="eyebrow" tone="danger">What happened</Text>
        {lines.map((line) => <Text key={line} variant="body">{line}</Text>)}
        <Text variant="caption" tone="secondary">We didn't treat anything we couldn't read as empty, and none of your saved presidencies were replaced.</Text>
      </Column>
    </Surface>
  );
}

function RetrySave() {
  const store = useStoresIfReady();
  const save = useSaveState();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ readonly ok: boolean; readonly text: string } | undefined>(undefined);
  async function retry() {
    if (!store) return;
    setBusy(true);
    try {
      const receipt = await store.retrySave();
      setResult(receipt.persisted ? { ok: true, text: "Your presidency is saved on this device." } : { ok: false, text: receipt.saveError ?? "This device still wouldn't store the save." });
    } catch (cause) {
      setResult({ ok: false, text: words(cause) });
    } finally {
      setBusy(false);
    }
  }
  if (result?.ok) return <Receipt title="Saved" date="Just now" lines={[]} record={result.text} />;
  return (
    <Step icon="sign" title="The presidency you're playing">
      <Text variant="body" tone="secondary">{`${save.status === "failed" ? `The last save didn't go through: ${save.error ?? "this device wouldn't store it"}.` : "Its last save worked."} Trying again saves your presidency just as it is now. Nothing happens twice, so you can try as many times as you need.`}</Text>
      <Row><Button kind="primary" icon="sign" disabled={busy} onPress={() => void retry()}>{busy ? "Saving…" : "Try saving again"}</Button></Row>
      {result ? <Notice tone="danger">{`${result.text} Try freeing up some space on this device, or export another presidency and then discard it. Then try again.`}</Notice> : null}
    </Step>
  );
}

function Integrity({ library, actions }: { readonly library: CampaignLibrary | null; readonly actions: LibraryActions }) {
  const damaged = library?.campaigns.filter((summary) => summary.status !== "healthy") ?? [];
  return (
    <Step icon="archive" title="Check your saves">
      {library === null ? <Text variant="body" tone="secondary">Checking every save…</Text> : damaged.length === 0 ? (
        <Row gap="sm"><Tag tone="success" icon="approve">All readable</Tag><Text variant="body" tone="secondary">{library.campaigns.length === 0 ? "There are no saves on this device yet, so nothing needs fixing." : `All ${library.campaigns.length} ${library.campaigns.length === 1 ? "save" : "saves"} on this device can be opened. Nothing needs fixing.`}</Text></Row>
      ) : (
        <Column gap="md">
          <Text variant="body" tone="secondary">{`${damaged.length} of ${library.campaigns.length} ${library.campaigns.length === 1 ? "save" : "saves"} can't be opened. If one can still be exported, export it to keep a copy. Then remove it to free up its slot.`}</Text>
          <Column gap="md" role="list">{damaged.map((summary) => <SaveCard key={summary.id} summary={summary} active={false} actions={actions} />)}</Column>
        </Column>
      )}
    </Step>
  );
}

/** The vault itself could not be read: say so, and offer the one retry that can change it. */
function VaultUnavailable({ reading, onRetry }: { readonly reading: boolean; readonly onRetry: () => void }) {
  return (
    <Step icon="caution" title="Get your saves back">
      <Text variant="body">We can't reach the saves on this device right now. We haven't treated them as empty, and nothing was replaced.</Text>
      <Text variant="body" tone="secondary">Make sure your browser lets this site store data, and close any other tab with this game open. Then try again. You won't need to reload the page.</Text>
      <Row><Button kind="primary" icon="review" disabled={reading} onPress={onRetry}>{reading ? "Checking…" : "Try again"}</Button></Row>
    </Step>
  );
}

/** Where a save problem is explained and fixed: the reason, then every option the device really has. */
export default function Recovery() {
  const state = useCampaignState();
  const store = useStoresIfReady();
  const { library, error, notice, actions, reading, retry } = useLibrary();
  const vaultDown = library === null && error !== null;
  // The reasons read the save store, which does not exist until the device's stores load, so a cold open waits here instead of throwing.
  if (!store) {
    return (
      <Page eyebrow="Save problems" icon="archive" title="Recovery" lede="What is wrong with the saves on this device." actions={<ReturnButton />}>
        <Text variant="body" tone="secondary" role="status">Opening the saves on this device…</Text>
      </Page>
    );
  }
  return (
    <Page eyebrow="Save problems" icon="archive" title="Recovery" lede="What is wrong with the saves on this device." actions={<ReturnButton />}>
      <Reasons failed={state.status === "failed" ? state.message : undefined} library={library} listError={error} />
      {state.status === "ready" ? <RetrySave /> : null}
      {error && library ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      {vaultDown ? <VaultUnavailable reading={reading} onRetry={() => void store?.restore().then(() => retry(), (cause: unknown) => console.warn("The vault could not be reopened.", cause))} /> : <Integrity library={library} actions={actions} />}
      <Row gap="sm" wrap role="navigation" aria-label="Where to go from here">
        {state.status === "failed" ? <Button kind="secondary" icon="review" onPress={() => void store?.restore()}>Try opening your presidency again</Button> : null}
        {state.status === "ready" ? <Button kind="secondary" icon="brief" onPress={() => router.push("/brief")}>Back to the Brief</Button> : null}
        <Button kind="quiet" icon="archive" onPress={() => router.push("/administrations")}>Your administrations</Button>
        <Button kind="quiet" icon="return" onPress={() => router.replace("/")}>Title screen</Button>
      </Row>
    </Page>
  );
}
