import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Icon } from "@admin/ui-web";
import { useCampaignStore, useSaveState } from "../app/hooks";

/**
 * Whether the device kept the campaign, beside a way to keep it now. A
 * refused write is said in place, with the retry and the door to recovery,
 * because an act that applied but did not save is still the player's.
 */
export function SaveStatus() {
  const store = useCampaignStore();
  const save = useSaveState();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const failed = save.status === "failed" || problem !== undefined;

  async function run(retry: boolean) {
    setBusy(true);
    try {
      const receipt = retry ? await store.retrySave() : await store.saveCampaign();
      setProblem(receipt.persisted ? undefined : receipt.saveError ?? "This device refused the save.");
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <span className="save-status" data-state="failed">
        <Button asChild kind="danger" size="sm" className="save-status__recovery"><Link to="/recovery" aria-label="Save failed: open recovery"><Icon name="caution" size={18} /><span className="ui-visually-hidden">Save failed</span></Link></Button>
        <span className="save-status__quick-retry">
          <Button kind="danger" size="sm" busy={busy} icon={<Icon name="caution" size={16} />} onClick={() => void run(true)}>
            Retry save
          </Button>
          <Link to="/recovery" className="save-status__door">
            Why?
          </Link>
        </span>
        <span className="ui-visually-hidden" role="alert">
          {problem ?? save.error ?? "The last save did not reach this device."}
        </span>
      </span>
    );
  }
  return (
    <span className="save-status" data-state={save.status}>
      <Button kind="ghost" size="sm" busy={busy || save.status === "saving"} icon={<Icon name="archive" size={16} />} onClick={() => void run(false)} aria-label={save.status === "saved" ? "Saved. Save again now" : "Save now"}>
        <span className="save-status__word">{save.status === "saved" ? "Saved" : "Save"}</span>
      </Button>
    </span>
  );
}
