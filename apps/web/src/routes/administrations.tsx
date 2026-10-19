import { Link, createFileRoute } from "@tanstack/react-router";
import { vaultCapacity, type CampaignLibrary } from "@admin/player-core";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, EmptyState, Icon, buttonClass } from "@admin/ui-web";
import { SaveCard } from "../screens/SaveCard";
import { useLibrary, type LibraryActions } from "../screens/use-library";
import { Screen } from "../shell/Screen";

function Import({ disabled, full, onFile }: { readonly disabled: boolean; readonly full: boolean; readonly onFile: (file: File) => void }) {
  return (
    <label className="saves-import" data-disabled={disabled ? "true" : undefined}>
      <span className="saves-import__title">Import a save exported from this game</span>
      <span className="saves-import__hint">{full ? "All slots are full. Discard one to make room." : "It opens as a new administration in an empty slot."}</span>
      <input
        type="file"
        accept="application/json,.json"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function Saved({ library, actions }: { readonly library: CampaignLibrary; readonly actions: LibraryActions }) {
  const { activeCampaignId, campaigns } = library;
  const active = campaigns.find((summary) => summary.id === activeCampaignId && summary.status === "healthy");
  const others = campaigns.filter((summary) => summary !== active);
  return (
    <>
      {active ? (
        <section className="saves-section" aria-labelledby="saves-active">
          <h2 id="saves-active" className="saves-section__title">Administration in play</h2>
          <ul className="saves-list">
            <SaveCard summary={active} active actions={actions} />
          </ul>
        </section>
      ) : null}
      <section className="saves-section" aria-labelledby="saves-others">
        <h2 id="saves-others" className="saves-section__title">{active ? "Other saved administrations" : "Saved administrations"}</h2>
        {others.length > 0 ? (
          <ul className="saves-list">
            {others.map((summary) => (
              <SaveCard key={summary.id} summary={summary} active={false} actions={actions} />
            ))}
          </ul>
        ) : (
          <EmptyState icon="emptyInbox" title={active ? "No other administration is saved" : "No administration is saved on this device"}>
            Start one below, or import a save you exported earlier.
          </EmptyState>
        )}
      </section>
    </>
  );
}

/** The saves on this device: the one in play first, then the rest, with every action the store supports. */
function Administrations() {
  const { library, error, notice, busy, reading, retry, actions, importSave } = useLibrary();
  const capacity = vaultCapacity(library?.campaigns.length ?? 0);
  return (
    <Screen title="Your administrations" icon="archive" eyebrow="Saved on this device" lede={`Each administration is one presidency, from the oath on. ${library ? `${capacity.used} of ${capacity.limit} slots are in use.` : ""}`} screenClass="workspace" camera="world">
      <div className="saves">
        {error ? (
          <p className="notice" data-tone="risk" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="notice" role="status">
            {notice}
          </p>
        ) : null}
        {!library ? reading ? <EmptyState busy title="Reading what this device holds" /> : <Card><CardHeader><CardTitle>Saved administrations are unavailable</CardTitle><CardDescription>This device's library has not been read. No existing save was removed or replaced.</CardDescription></CardHeader><CardContent><p className="stage-note">Check that site storage is allowed. Close other tabs using this game if they are blocking the vault.</p></CardContent><CardFooter><Button kind="primary" icon={<Icon name="review" size={18} />} onClick={retry}>Retry reading saves</Button><Button asChild><Link to="/recovery">Save recovery</Link></Button></CardFooter></Card> : <Saved library={library} actions={actions} />}
        <section className="saves-section" aria-labelledby="saves-add">
          <h2 id="saves-add" className="saves-section__title">Add an administration</h2>
          {!library ? <Button disabled>Save storage must open before starting an administration</Button> : capacity.full ? (
            <p className="stage-note">All {capacity.limit} slots are in use. Discard one above to start another.</p>
          ) : (
            <p>
              <Link to="/founding" className={buttonClass("secondary", "md")}>
                Start a new administration
              </Link>
            </p>
          )}
          <Import disabled={busy || capacity.full || !library} full={capacity.full} onFile={importSave} />
        </section>
      </div>
    </Screen>
  );
}

export const Route = createFileRoute("/administrations")({
  component: Administrations,
});
