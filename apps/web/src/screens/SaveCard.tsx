import { useId, useState } from "react";
import { formatDate, isRetiredStatus, type CampaignSummary } from "@admin/player-core";
import { Button, Field, Icon, Input, Sheet, Tag } from "@admin/ui-web";
import { worldNations } from "@admin/world";
import type { LibraryActions } from "./use-library";

const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));

const DAMAGE: Readonly<Record<CampaignSummary["status"], string>> = {
  healthy: "",
  "payload-missing": "The save's data is missing from this device.",
  "payload-corrupt": "The save is damaged and can't be read.",
  "retired-world": "Made with an older version of the game, so it can't be opened.",
  "retired-calendar": "Made with an older version of the game's calendar, so it can't be continued.",
};

/** The library writes the date as year-month-day; the player reads it in words. */
function readableDate(label: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  return match ? formatDate({ year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }) : label;
}

export function lastSaved(savedAt: number | null): string {
  if (savedAt === null) return "Not saved yet";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(savedAt);
}

/** A save that is damaged beyond reading has no file to give back; one this build merely can't continue still does. */
function exportable(summary: CampaignSummary): boolean {
  return summary.status === "healthy" || isRetiredStatus(summary.status);
}

function Rename({ summary, actions, onDone }: { readonly summary: CampaignSummary; readonly actions: LibraryActions; readonly onDone: () => void }) {
  const [name, setName] = useState(summary.name);
  const trimmed = name.trim();
  return (
    <form
      className="save-card__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed && trimmed !== summary.name) actions.rename(summary.id, trimmed);
        onDone();
      }}
    >
      <Field label="Name of this administration">{(control) => <Input {...control} autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />}</Field>
      <div className="save-card__row">
        <Button kind="primary" size="sm" type="submit" disabled={!trimmed || actions.busy}>
          Save name
        </Button>
        <Button kind="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Discard({ summary, active, actions, onDone }: { readonly summary: CampaignSummary; readonly active: boolean; readonly actions: LibraryActions; readonly onDone: () => void }) {
  const id = useId();
  return (
    <div className="save-card__confirm" role="group" aria-labelledby={id}>
      <p id={id}>
        Discard “{summary.name}” from this device? {active ? "It is the administration in play. " : ""}The save is deleted and can't be brought back unless you exported it first.
      </p>
      <div className="save-card__row">
        <Button kind="danger" size="sm" disabled={actions.busy} onClick={() => actions.discard(summary.id)}>
          Discard “{summary.name}”
        </Button>
        <Button kind="ghost" size="sm" onClick={onDone}>
          Keep it
        </Button>
      </div>
    </div>
  );
}

function Particulars({ summary }: { readonly summary: CampaignSummary }) {
  return (
    <dl className="save-card__facts">
      <div>
        <dt>President</dt>
        <dd>{summary.leader}</dd>
      </div>
      <div>
        <dt>Government</dt>
        <dd>{NATION_NAMES.get(summary.nation) ?? summary.nation}</dd>
      </div>
      <div>
        <dt>In office</dt>
        <dd>
          {readableDate(summary.date)}, week {summary.turn}
        </dd>
      </div>
      <div>
        <dt>Last saved</dt>
        <dd>{lastSaved(summary.savedAt)}</dd>
      </div>
    </dl>
  );
}

type Mode = "view" | "rename" | "discard";

/** One saved administration: what it is, when it was last saved, and every action the store supports on it. */
export function SaveCard({ summary, active, actions }: { readonly summary: CampaignSummary; readonly active: boolean; readonly actions: LibraryActions }) {
  const [mode, setMode] = useState<Mode>("view");
  const healthy = summary.status === "healthy";
  const done = () => setMode("view");
  return (
    <li className={healthy ? "save-card ui-card-door" : "save-card"} data-active={active ? "true" : undefined} data-damaged={healthy ? undefined : "true"}>
      <div className="save-card__head">
        <Icon name={healthy ? "subjectSeal" : "caution"} size={28} className="save-card__seal" />
        <p className="save-card__name">{summary.name}</p>
        {active ? <Tag tone="identity">In play</Tag> : healthy ? null : <Tag tone="risk" icon="caution">Can't be opened</Tag>}
      </div>
      {healthy ? <Particulars summary={summary} /> : <p className="save-card__damage">{summary.error ?? DAMAGE[summary.status]}</p>}
      <Sheet open={mode === "rename"} onClose={done} title={`Rename ${summary.name}`}><Rename summary={summary} actions={actions} onDone={done} /></Sheet>
      <Sheet open={mode === "discard"} onClose={done} title={`Discard ${summary.name}`}><Discard summary={summary} active={active} actions={actions} onDone={done} /></Sheet>
      {(
        <div className="save-card__row">
          {healthy ? (
            <Button className="ui-card-door__link" kind={active ? "primary" : "secondary"} size="sm" disabled={actions.busy} onClick={() => actions.open(summary.id)}>
              {active ? "Continue" : "Open"}
            </Button>
          ) : null}
          {healthy ? (
            <Button kind="ghost" size="sm" disabled={actions.busy} onClick={() => setMode("rename")}>
              Rename
            </Button>
          ) : null}
          {exportable(summary) ? (
            <Button kind="ghost" size="sm" disabled={actions.busy} onClick={() => actions.exportSave(summary.id, summary.name)}>
              Export
            </Button>
          ) : null}
          <Button kind="ghost" size="sm" disabled={actions.busy} onClick={() => setMode("discard")}>
            {healthy ? "Discard" : "Remove"}
          </Button>
        </div>
      )}
    </li>
  );
}
