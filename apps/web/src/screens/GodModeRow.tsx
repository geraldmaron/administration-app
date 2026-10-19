import { useState } from "react";
import { enableGodMode, isGodMode, type Campaign } from "@admin/engine";
import { CompareAuthorize, Receipt, type CompareRow } from "@admin/ui-web";
import { useCampaignState, useEntitlement } from "../app/hooks";
import { useAuthorize } from "../app/use-authorize";

const OPTIONS = [
  { id: "standard", label: "Keep it as played", baseline: true },
  { id: "god", label: "Enable God Mode", icon: "open", accent: "red" },
] as const;

const ROWS: readonly CompareRow[] = [
  { label: "Campaign status", icon: "active", cells: { standard: "As it is now", god: "Sandbox, for good" } },
  { label: "Ranked", icon: "graph", cells: { standard: "As it is now", god: "Never again" } },
  { label: "What you can see", icon: "hidden", cells: { standard: "What your office learns", god: "Every government's hidden readings" } },
  { label: "Removal from office", icon: "gavel", cells: { standard: "Can happen", god: "Can't happen" } },
  { label: "On the Record", icon: "record", cells: { standard: "Nothing new", god: "Marked as a sandbox from this week" } },
];

function Enable({ campaign }: { readonly campaign: Campaign }) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const [selected, setSelected] = useState<string>("standard");
  const [done, setDone] = useState<{ readonly date: string; readonly saveError?: string } | undefined>(undefined);
  async function enable() {
    const authorized = await authorize(() => ({ packet: enableGodMode(campaign) }), { tier: "confirm", title: "God Mode enabled", verb: "Enable God Mode", danger: true });
    if (authorized) setDone({ date: authorized.date, ...(authorized.saveError ? { saveError: authorized.saveError } : {}) });
  }
  if (!done && isGodMode(campaign)) return <p className="stage-note">God Mode is on for this administration. It stays on.</p>;
  if (done) {
    return (
      <Receipt
        title="God Mode enabled"
        date={done.date}
        lines={[
          { label: "Status", value: "Sandbox, for good" },
          { label: "Removal", value: "Can't happen" },
        ]}
        record={done.saveError ? `God Mode is on for this administration, but this device did not save it. Reason: ${done.saveError} Use Retry save in the top bar.` : "Marked on the Record as a sandbox from this week."}
      />
    );
  }
  return (
    <>
      <CompareAuthorize
        title="God Mode for this administration"
        options={OPTIONS}
        rows={ROWS}
        selected={selected}
        onSelect={setSelected}
        verb="Enable God Mode"
        tone="danger"
        busy={busy}
        review="This can't be undone. The campaign becomes a sandbox and is marked so on the Record."
        onAuthorize={() => void enable()}
      />
      {problem ? (
        <p className="notice" data-tone="risk" role="alert">
          {problem}
        </p>
      ) : null}
    </>
  );
}

/** The one God Mode row: drawn only for a player whose entitlement the shell may honor. */
export function GodModeRow() {
  const { snapshot } = useEntitlement();
  const state = useCampaignState();
  if (!snapshot.godMode) return null;
  const devGrant = snapshot.source === "dev-override";
  return (
    <section className="settings-group" aria-labelledby="god-mode-title" data-testid="god-mode-row">
      <h2 id="god-mode-title" className="settings-group__title">
        God Mode
      </h2>
      <p className="stage-note">{devGrant ? "Granted by the development override in this development build. A shipped build never honors it." : "You hold the God Mode entitlement."}</p>
      {state.status !== "ready" ? (
        <p className="stage-note">Open an administration to enable it for that administration.</p>
      ) : (
        <Enable campaign={state.campaign} />
      )}
    </section>
  );
}
