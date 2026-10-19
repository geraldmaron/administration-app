import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { formatDate, vaultCapacity, type CampaignState } from "@admin/player-core";
import { BrandGlyph, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, EmptyState, Icon, buttonClass } from "@admin/ui-web";
import { useCampaignState, useStoresIfReady } from "../app/hooks";
import { Screen } from "../shell/Screen";

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

function InPlay({ state }: { readonly state: Extract<CampaignState, { status: "ready" }> }) {
  const { campaign } = state;
  return (
    <section className="entry-card ui-card-door" aria-labelledby="in-play-title" data-lead="true">
      <p id="in-play-title" className="entry-card__kicker">
        Resume
      </p>
      <p className="entry-card__name">President {campaign.founding.leader.name}</p>
      <p className="entry-card__meta">
        {formatDate(campaign.calendar)} · Week {campaign.turn}
      </p>
      <Link to="/brief" className={buttonClass("primary", "md", "entry-card__go ui-card-door__link")}>
        Continue the administration
      </Link>
    </section>
  );
}

/** What a device with saves but none in play offers first: the saves, not a blank start. */
function SavedOnly({ used }: { readonly used: number }) {
  return (
    <section className="entry-card ui-card-door" aria-labelledby="saved-title" data-lead="true">
      <p id="saved-title" className="entry-card__kicker">
        Saved on this device
      </p>
      <p className="entry-card__name">
        {used} {used === 1 ? "administration" : "administrations"}
      </p>
      <p className="entry-card__meta">None is open right now.</p>
      <Link to="/administrations" className={buttonClass("primary", "md", "entry-card__go ui-card-door__link")}>
        Open a saved administration
      </Link>
    </section>
  );
}

function Doors({ used, leading, ready }: { readonly used: number | undefined; readonly leading: boolean; readonly ready: boolean }) {
  const full = used !== undefined && vaultCapacity(used).full;
  return (
    <ul className="entry-doors">
      <li>
        {full ? (
          <p className="entry-doors__full">
            All {vaultCapacity(used ?? 0).limit} save slots are in use. <Link to="/administrations">Discard one</Link> to start another.
          </p>
        ) : !ready ? (
          <Button kind={leading ? "secondary" : "primary"} disabled title="Saved administrations are still opening">
            <Icon name="sign" size={18} /> Start a new administration
          </Button>
        ) : (
          <Link to="/founding" className={buttonClass(leading ? "secondary" : "primary", "md")}>
            <Icon name="sign" size={18} /> Start a new administration
          </Link>
        )}
      </li>
      <li>
        <Link to="/administrations" className={buttonClass("ghost", "md")}>
          <Icon name="archive" size={18} /> Your administrations{used !== undefined ? ` (${used} of ${vaultCapacity(used).limit})` : ""}
        </Link>
      </li>
      <li>
        <Link to="/settings" className={buttonClass("ghost", "md")}>
          <Icon name="utilitySettings" size={18} /> Settings
        </Link>
      </li>
    </ul>
  );
}

/** The title screen, over the slowly turning world. */
function Title() {
  const state = useCampaignState();
  const store = useStoresIfReady();
  const used = useSlotsUsed();
  const resuming = state.status === "ready";
  const savedOnly = !resuming && state.status !== "loading" && used !== undefined && used > 0;
  return (
    <Screen title="Office of the President" eyebrow="The United States of America" lede="Govern the United States among the world's 196 governments, one decision at a time." screenClass="spatial" camera="world" turning emblem={<BrandGlyph size={64} className="title__mark" />}>
      <div className="entry">
        {state.status === "loading" ? <EmptyState busy title="Opening this device's saves" /> : null}
        {state.status === "failed" ? (
          <Card><CardHeader><CardTitle>This administration could not open</CardTitle><CardDescription>Your saved data has not been replaced with an empty administration.</CardDescription></CardHeader><CardContent><p className="notice" data-tone="risk" role="alert">{state.message}</p></CardContent><CardFooter><Button kind="primary" onClick={() => void store?.restore()}>Retry opening saves</Button><Button asChild><Link to="/recovery">Go to recovery</Link></Button></CardFooter></Card>
        ) : null}
        {resuming ? <InPlay state={state} /> : null}
        {savedOnly ? <SavedOnly used={used} /> : null}
        <Doors used={used} leading={resuming || savedOnly} ready={state.status !== "loading" && used !== undefined} />
      </div>
    </Screen>
  );
}

export const Route = createFileRoute("/")({
  component: Title,
});
