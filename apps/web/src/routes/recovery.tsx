import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { CampaignLibrary } from "@admin/player-core";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, EmptyState, Icon, Receipt, buttonClass } from "@admin/ui-web";
import { useCampaignState, useCampaignStore, useSaveState } from "../app/hooks";
import { SaveCard } from "../screens/SaveCard";
import { useLibrary, type LibraryActions } from "../screens/use-library";
import { Screen } from "../shell/Screen";

function RetrySave() {
  const store = useCampaignStore();
  const save = useSaveState();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ readonly ok: boolean; readonly text: string } | undefined>(undefined);
  async function retry() {
    setBusy(true);
    try {
      const receipt = await store.retrySave();
      setResult(receipt.persisted ? { ok: true, text: "The campaign is saved on this device." } : { ok: false, text: receipt.saveError ?? "The device refused the save again." });
    } catch (cause) {
      setResult({ ok: false, text: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setBusy(false);
    }
  }
  if (result?.ok) return <Receipt title="Saved" date="Just now" lines={[]} record={result.text} />;
  return (
    <section className="recovery-step" aria-labelledby="retry-title">
      <h2 id="retry-title" className="settings-group__title">
        <Icon name="sign" size={20} /> The campaign in play
      </h2>
      <p className="stage-note">
        {save.status === "failed" ? `The last save failed: ${save.error ?? "the device refused it"}.` : "Its last save reached this device."} Retrying writes the campaign exactly as it stands. Nothing is applied twice, so it is safe to press as often as you need.
      </p>
      <Button kind="primary" busy={busy} onClick={() => void retry()}>
        Retry the save
      </Button>
      {result ? (
        <p className="notice" data-tone="risk" role="alert">
          {result.text} Free some space on this device, or export another administration and discard it, then retry.
        </p>
      ) : null}
    </section>
  );
}

function Damaged({ library, actions }: { readonly library: CampaignLibrary | null; readonly actions: LibraryActions }) {
  const damaged = library?.campaigns.filter((summary) => summary.status !== "healthy") ?? [];
  return (
    <section className="recovery-step" aria-labelledby="damaged-title">
      <h2 id="damaged-title" className="settings-group__title">
        <Icon name="archive" size={20} /> Save integrity
      </h2>
      {library === null ? (
        <EmptyState busy title="Checking every save" />
      ) : damaged.length === 0 ? (
        <EmptyState icon="emptyInbox" title="Every save on this device reads">
          Nothing here needs repair.
        </EmptyState>
      ) : (
        <>
          <p className="stage-note">
            {damaged.length} of {library.campaigns.length} {library.campaigns.length === 1 ? "save" : "saves"} can't be opened. Export one that can still be read to keep a copy, then remove it to free its slot.
          </p>
          <ul className="saves-list">
            {damaged.map((summary) => (
              <SaveCard key={summary.id} summary={summary} active={false} actions={actions} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Reasons({ failedMessage }: { readonly failedMessage: string | undefined }) {
  const save = useSaveState();
  const reasons = [failedMessage ? `Opening your saves failed: ${failedMessage}` : undefined, save.status === "failed" ? `The last save failed: ${save.error ?? "the device refused it"}.` : undefined].filter((reason): reason is string => reason !== undefined);
  if (reasons.length === 0) return null;
  return (
    <div className="notice" data-tone="risk" role="alert">
      <p className="recovery__why">Why you are here</p>
      {reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}
    </div>
  );
}

/** Where a save problem is explained and fixed: the reason, then every option the device really has. */
function Recovery() {
  const state = useCampaignState();
  const { library, error, notice, actions, reading, retry } = useLibrary();
  const store = useCampaignStore();
  return (
    <Screen icon="archive" title="Recovery" eyebrow="Save problems" lede="What this device could not read or keep, and what you can do about it." screenClass="workspace" camera="world">
      <div className="recovery">
        <Reasons failedMessage={state.status === "failed" ? state.message : undefined} />
        {state.status === "ready" ? <RetrySave /> : null}
        {error && library ? (
          <p className="notice" data-tone="risk" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="notice" role="status">
            {notice}
          </p>
        ) : null}
        {library === null && error ? <Card><CardHeader><CardTitle>Restore access to this device's saves</CardTitle><CardDescription>The vault is unavailable. It has not been treated as empty, and no saved administration was replaced.</CardDescription></CardHeader><CardContent><p className="stage-note">Allow site storage, close any tab blocking the vault, then retry. Reloading is not required when access returns.</p></CardContent><CardFooter><Button kind="primary" busy={reading} onClick={() => { void store.restore().then(() => retry()); }}>Retry reading saves</Button></CardFooter></Card> : null}
        {library !== null || !error ? <Damaged library={library} actions={actions} /> : null}
        <nav className="recovery__next" aria-label="Where to go from here">
          {state.status === "failed" ? (
            <Button kind="secondary" onClick={() => window.location.reload()}>
              Reload and try again
            </Button>
          ) : null}
          {state.status === "ready" ? (
            <Link to="/brief" className={buttonClass("secondary")}>
              Back to the Brief
            </Link>
          ) : null}
          <Link to="/administrations" className={buttonClass("ghost")}>
            Your administrations
          </Link>
          <Link to="/" className={buttonClass("ghost")}>
            Title screen
          </Link>
        </nav>
      </div>
    </Screen>
  );
}

export const Route = createFileRoute("/recovery")({
  component: Recovery,
});
