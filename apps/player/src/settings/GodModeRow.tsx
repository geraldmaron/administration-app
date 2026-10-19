import { useRef, useState } from "react";
import { enableGodMode, isGodMode, type Campaign } from "@admin/engine";
import { formatDate } from "@admin/player-core";
import { Button, Column, Divider, Row, Sheet, Text } from "@admin/ui";
import { useCampaignState, useCampaignStore, useEntitlement } from "../device/hooks";
import { Notice, SettingsGroup } from "./parts";

const ROWS: readonly (readonly [string, string, string])[] = [
  ["This game", "As it is now", "Free play (a sandbox), for good"],
  ["Counts toward rankings", "Yes, as it does now", "Never again"],
  ["What you can see", "Only what your advisers find out", "Every country's hidden numbers"],
  ["Removal from office", "Can happen", "Can't happen"],
  ["On the Record", "Nothing new", "Marked as free play from this week"],
];

function Comparison() {
  return (
    <Column gap="xs" role="table" aria-label="Keep playing normally, or enable God Mode">
      <Row gap="md" role="row">
        <Text variant="caption" tone="tertiary" flex={1} role="columnheader">
          {" "}
        </Text>
        <Text variant="caption" weight="strong" flex={1} role="columnheader">
          Keep playing normally
        </Text>
        <Text variant="caption" weight="strong" tone="danger" flex={1} role="columnheader">
          Enable God Mode
        </Text>
      </Row>
      {ROWS.map(([label, standard, god]) => (
        <Column key={label} gap="xs">
          <Divider />
          <Row gap="md" top role="row">
            <Text variant="label" flex={1} role="rowheader">
              {label}
            </Text>
            <Text variant="caption" tone="secondary" flex={1} role="cell">
              {standard}
            </Text>
            <Text variant="caption" flex={1} role="cell">
              {god}
            </Text>
          </Row>
        </Column>
      ))}
    </Column>
  );
}

type Outcome = { readonly date: string; readonly saveError?: string };

/** The commit behind the confirmation: once per press, against the campaign the comparison was read from. */
function useEnable(campaign: Campaign) {
  const store = useCampaignStore();
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [done, setDone] = useState<Outcome | undefined>(undefined);
  const enable = async () => {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setProblem(undefined);
    try {
      const receipt = await store.commit(enableGodMode(campaign), { basis: campaign });
      const after = store.getState();
      const date = after.status === "ready" ? formatDate(after.campaign.calendar) : formatDate(campaign.calendar);
      setDone({ date, ...(receipt.saveError ? { saveError: receipt.saveError } : {}) });
    } catch (cause) {
      latch.current = false;
      setProblem(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  return { busy, problem, done, enable };
}

function Enable({ campaign }: { readonly campaign: Campaign }) {
  const [confirming, setConfirming] = useState(false);
  const { busy, problem, done, enable } = useEnable(campaign);
  if (done) {
    return (
      <Notice tone={done.saveError ? "danger" : "info"}>
        {done.saveError
          ? `God Mode is on for this presidency as of ${done.date}, but this device couldn't save the change. ${done.saveError} You can try saving again from the top bar.`
          : `God Mode is on as of ${done.date}. This game is now free play for good. You can't be removed from office, and your Record marks the change from this week.`}
      </Notice>
    );
  }
  if (isGodMode(campaign)) return <Text variant="body" tone="secondary">God Mode is on for this presidency, and it can't be turned off.</Text>;
  const close = () => setConfirming(false);
  return (
    <Column gap="md">
      <Comparison />
      <Button kind="danger" icon="open" onPress={() => setConfirming(true)} testID="god-mode-enable">
        Enable God Mode
      </Button>
      {problem ? <Notice tone="danger">{problem}</Notice> : null}
      <Sheet
        open={confirming}
        onClose={close}
        eyebrow="Final check"
        title="Enable God Mode"
        footer={
          <Row gap="sm" wrap>
            <Button kind="danger" disabled={busy} onPress={() => void enable().then(close)}>
              {busy ? "Enabling…" : "Enable God Mode"}
            </Button>
            <Button kind="quiet" onPress={close}>
              Keep playing normally
            </Button>
          </Row>
        }
      >
        <Text variant="body">This can't be undone. This game becomes free play, and your Record will say so.</Text>
        <Comparison />
      </Sheet>
    </Column>
  );
}

/** The one God Mode row: drawn only for a player whose entitlement the shell may honor. */
export function GodModeRow() {
  const { snapshot } = useEntitlement();
  const state = useCampaignState();
  if (!snapshot.godMode) return null;
  const devGrant = snapshot.source === "dev-override";
  return (
    <SettingsGroup icon="open" title="God Mode" description={devGrant ? "You have this because this is a test build of the game. The released game never turns it on this way." : "You have access to God Mode."} testID="god-mode-row">
      {state.status === "ready" ? <Enable campaign={state.campaign} /> : <Text variant="body" tone="secondary">Open a saved presidency first. God Mode is turned on for one presidency at a time.</Text>}
    </SettingsGroup>
  );
}
