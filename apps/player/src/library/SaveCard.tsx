import { useState } from "react";
import { formatDate, isRetiredStatus, type CampaignSummary } from "@admin/player-core";
import { worldNations } from "@admin/world";
import { Button, CardLink, Column, Divider, Icon, Row, Surface, Tag, Text } from "@admin/ui";
import { Field, TextInput } from "@admin/ui/forms";
import { Fact } from "@admin/ui/record";
import { SAVE_FILES_SUPPORTED } from "./save-file";
import type { LibraryActions } from "./use-library";

const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));

const DAMAGE: Readonly<Record<CampaignSummary["status"], string>> = {
  healthy: "",
  "payload-missing": "We can't find this save's data on this device.",
  "payload-corrupt": "The save is damaged and can't be read.",
  "retired-world": "This save was made with an older version of the game, so it can't be opened.",
  "retired-calendar": "This save was made before the game's calendar changed, so you can't keep playing it.",
};

/** The library writes the date as year-month-day; the player reads it in words. */
function readableDate(label: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  return match ? formatDate({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }) : label;
}

function lastSaved(savedAt: number | null): string {
  if (savedAt === null) return "Not saved yet";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(savedAt);
}

/** A save that is damaged beyond reading has no file to give back; one this build merely can't continue still does. */
function exportable(summary: CampaignSummary): boolean {
  return SAVE_FILES_SUPPORTED && (summary.status === "healthy" || isRetiredStatus(summary.status));
}

function Particulars({ summary }: { readonly summary: CampaignSummary }) {
  return (
    <Row wrap gap="md" top>
      <Fact label="President" value={summary.leader} />
      <Fact label="Country" value={NATION_NAMES.get(summary.nation) ?? summary.nation} />
      <Fact label="In office" value={`${readableDate(summary.date)}, week ${summary.turn}`} />
      <Fact label="Last saved" value={lastSaved(summary.savedAt)} />
    </Row>
  );
}

function Rename({ summary, actions, onDone }: { readonly summary: CampaignSummary; readonly actions: LibraryActions; readonly onDone: () => void }) {
  const [name, setName] = useState(summary.name);
  const trimmed = name.trim();
  const save = () => {
    if (trimmed && trimmed !== summary.name) actions.rename(summary.id, trimmed);
    onDone();
  };
  return (
    <Column gap="sm">
      <Field label="Name of this presidency">{(control) => <TextInput {...control} autoFocus value={name} maxLength={80} onChangeText={setName} onSubmit={save} />}</Field>
      <Row gap="sm" wrap>
        <Button kind="primary" size="compact" disabled={!trimmed || actions.busy} onPress={save}>
          Save name
        </Button>
        <Button kind="quiet" size="compact" onPress={onDone}>
          Cancel
        </Button>
      </Row>
    </Column>
  );
}

/** The confirmation in place, on the card itself, so the save being discarded is the one in view. */
function Discard({ summary, active, actions, onDone }: { readonly summary: CampaignSummary; readonly active: boolean; readonly actions: LibraryActions; readonly onDone: () => void }) {
  return (
    <Surface level="sunken" pad="md" accentEdge="danger" role="group" aria-label={`Discard ${summary.name}?`}>
      <Column gap="sm">
        <Text variant="body">
          Discard “{summary.name}” from this device? {active ? "It's the presidency you're playing now. " : ""}Once it's gone, you can't get it back unless you exported a copy first.
        </Text>
        <Row gap="sm" wrap>
          <Button kind="danger" size="compact" disabled={actions.busy} onPress={() => actions.discard(summary.id)} testID="discard-confirm">
            {`Discard “${summary.name}”`}
          </Button>
          <Button kind="quiet" size="compact" onPress={onDone}>
            Keep it
          </Button>
        </Row>
      </Column>
    </Surface>
  );
}

/** Everything a save supports besides opening it, which is the card itself. */
function Actions({ summary, actions, setMode }: { readonly summary: CampaignSummary; readonly actions: LibraryActions; readonly setMode: (mode: Mode) => void }) {
  const healthy = summary.status === "healthy";
  return (
    <Row gap="sm" wrap>
      {healthy ? (
        <Button kind="quiet" size="compact" disabled={actions.busy} onPress={() => setMode("rename")}>
          Rename
        </Button>
      ) : null}
      {exportable(summary) ? (
        <Button kind="quiet" size="compact" disabled={actions.busy} onPress={() => actions.exportSave(summary.id, summary.name)}>
          Export
        </Button>
      ) : null}
      <Button kind="quiet" size="compact" disabled={actions.busy} onPress={() => setMode("discard")}>
        {healthy ? "Discard" : "Remove"}
      </Button>
    </Row>
  );
}

type Mode = "view" | "rename" | "discard";

function Header({ summary, active, opens }: { readonly summary: CampaignSummary; readonly active: boolean; readonly opens: boolean }) {
  const healthy = summary.status === "healthy";
  return (
    <Row gap="sm" wrap>
      <Icon name={healthy ? "subjectSeal" : "caution"} size={28} tone={healthy ? "gold" : "danger"} />
      <Text variant="title" flex={1} minWidth={160}>
        {summary.name}
      </Text>
      {active ? <Tag tone="authority">In play</Tag> : healthy ? null : <Tag tone="danger" icon="caution">Can't be opened</Tag>}
      {opens ? (
        <Row gap="2xs">
          <Text variant="label" tone="accent">{active ? "Continue" : "Open"}</Text>
          <Icon name="chevron" size={16} tone="accent" />
        </Row>
      ) : null}
    </Row>
  );
}

/**
 * One saved administration: what it is, when it was last saved, and every
 * action the store supports on it. A healthy save opens from anywhere on the
 * card; while it is being renamed or discarded the card holds still, so a
 * stray press cannot open the presidency in the middle of either.
 */
export function SaveCard({ summary, active, actions }: { readonly summary: CampaignSummary; readonly active: boolean; readonly actions: LibraryActions }) {
  const [mode, setMode] = useState<Mode>("view");
  const healthy = summary.status === "healthy";
  const opens = healthy && mode === "view";
  const done = () => setMode("view");
  const edge = active ? "gold" : healthy ? undefined : "danger";
  const body = (
    <Column gap="md">
      <Header summary={summary} active={active} opens={opens} />
      {healthy ? <Particulars summary={summary} /> : <Text variant="body" tone="danger">{summary.error ?? DAMAGE[summary.status]}</Text>}
      <Divider />
      {mode === "rename" ? <Rename summary={summary} actions={actions} onDone={done} /> : null}
      {mode === "discard" ? <Discard summary={summary} active={active} actions={actions} onDone={done} /> : null}
      {mode === "view" ? <Actions summary={summary} actions={actions} setMode={setMode} /> : null}
    </Column>
  );
  return (
    <Column role="listitem">
      {opens ? (
        <CardLink level="raised" pad="lg" {...(edge ? { accentEdge: edge } : {})} label={`${active ? "Continue" : "Open"} ${summary.name}`} onPress={() => (actions.busy ? undefined : actions.open(summary.id))}>
          {body}
        </CardLink>
      ) : (
        <Surface level="raised" pad="lg" {...(edge ? { accentEdge: edge } : {})} aria-label={summary.name}>
          {body}
        </Surface>
      )}
    </Column>
  );
}
