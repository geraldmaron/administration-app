import { AuthorityHelp } from "../../help/AuthorityHelp";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMERGENCY_RENEWAL_TURNS, type Campaign } from "@admin/engine";
import {
  emergencyBoard,
  formatDate,
  formatSignedPoints,
  lapseWords,
  type ConditionBoardRow,
  type DeclarationRow,
  type EmergencyBoard,
  type GuardRow,
} from "@admin/player-core";
import { Bar, Button, Card, CardHeader, CardContent, Collection, EmptyState, Gauge, Sheet, Stat, Icon, Tag, type IconName } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { CONDITION_GLYPH } from "../../shell/glyphs";
import { MetricActs, MetricReading } from "../../shell/MetricReading";
import { Screen } from "../../shell/Screen";
import { valenceOf, type Valence } from "../../shell/valence";
import { ActDone } from "../policy/ActDone";
import { useAct } from "../policy/use-act";
import { prioritizedIncidents } from "./incidents";
import { EmergencyActPanel, type EmergencyAct } from "./EmergencyActs";
import "../policy/policy.css";
import "./emergency.css";

type Open = (act: EmergencyAct) => void;

function Summary({ board, incidents }: { readonly board: EmergencyBoard; readonly incidents: readonly ConditionBoardRow[] }) {
  const uncovered = incidents.filter((row) => !row.covered).length;
  const items: readonly (readonly [string, string, Valence, IconName, string])[] = [
    ["Declarations in force", String(board.declarations.length), "neutral", "order", "Declared scopes"],
    ["Running at home", String(incidents.length), incidents.length > 0 ? "watch" : "good", "eventEmergency", incidents.length > 0 ? "Conditions and incidents" : "Nothing running"],
    ["Not covered by a declaration", String(uncovered), uncovered > 0 ? "watch" : "good", "caution", uncovered > 0 ? "Coverage needs review" : "All covered"],
    ["Standing cost this week", board.weeklyCost > 0 ? `${formatSignedPoints(-board.weeklyCost)} pts` : "None", board.weeklyCost > 0 ? "bad" : "good", "economyRecession", "International Standing"],
  ];
  return (
    <dl className="emergency-summary" aria-label="Emergency summary">
      {items.map(([label, value, valence, icon, note]) => (
        <div key={label} className="emergency-summary__item">
          <dt>
            <Icon name={icon} size={18} />
            {label}
          </dt>
          <dd className="ui-valence-ink" data-valence={valence}>
            {value}
            <span className="emergency-summary__note">{note}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function IncidentRow({ row, selected, onSelect }: { readonly row: ConditionBoardRow; readonly selected: boolean; readonly onSelect: (id: string) => void }) {
  return (
    <li className="incident" data-selected={selected ? "true" : undefined} data-stance={row.severity.stance} data-valence={valenceOf(row.severity.stance)}>
      <button type="button" className="incident__button" aria-pressed={selected} onClick={() => onSelect(row.id)}>
        <Icon name={CONDITION_GLYPH[row.kind]} size={24} className="incident__glyph" />
        <span className="incident__body">
          <span className="incident__headline">{row.headline}</span>
          <span className="incident__where">{row.standfirst}</span>
          <span className="incident__severity">
            <span className="incident__severity-label">Severity</span>
            <Bar label={`Severity ${row.severity.value}`} value={row.severity.fraction} tone={valenceOf(row.severity.stance)} />
            <span className="incident__severity-figure ui-valence-ink" data-valence={valenceOf(row.severity.stance)}>
              {row.severity.value}
            </span>
          </span>
          <span className="incident__tags">
            {row.incident ? <Tag>One-afternoon event</Tag> : null}
            {row.covered ? (
              <Tag tone="identity" icon="order">
                Declared
              </Tag>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

/** The scope, the authority a declaration carries, and the resources that answer it, for the incident the President selected. */
function Response({ row, guard, onOpen }: { readonly row: ConditionBoardRow; readonly guard: GuardRow | undefined; readonly onOpen: Open }) {
  return (
    <section className="emergency-response" aria-labelledby="emergency-response-title">
      <h2 id="emergency-response-title" className="brief-section__title">
        <Icon name={CONDITION_GLYPH[row.kind]} size={20} /> Response: {row.headline}
      </h2>
      <Stat layout="comparison" label={row.severity.label} value={row.severity.value} tone={valenceOf(row.severity.stance)} reading={<Bar value={row.severity.fraction} tone={valenceOf(row.severity.stance)} />} period={row.severity.note} />
      <dl className="order-terms">
        <div className="order-terms__row">
          <dt>Scope a declaration could take</dt>
          <dd>{row.covered ? "A declaration already reaches it." : row.declarable.length > 0 ? row.declarable.map((option) => option.where).join("; or ") : "None today: a declaration needs a condition still running where it reaches."}</dd>
        </div>
        <div className="order-terms__row">
          <dt>Authority</dt>
          <dd>A declaration records the modeled emergency scope. It does not replace statute-specific findings or funding. The simulation applies a weekly International Standing cost and a renewal window.</dd>
        </div>
        <div className="order-terms__row">
          <dt>Resources</dt>
          <dd>{guard ? `State support coordination; the governor's likely answer: ${guard.forecast.toLowerCase()}.` : "No National Guard request is open for it."}</dd>
        </div>
      </dl>
      <AuthorityHelp topic="emergency-relief" compact />
      {guard ? <AuthorityHelp topic="domestic-force" compact /> : null}
      <div className="declaration__acts">
        {row.declarable.length > 0 ? (
          <Button kind="danger" size="sm" onClick={() => onOpen({ kind: "declare", conditionId: row.id })}>
            Declare an emergency
          </Button>
        ) : null}
        {guard ? (
          <Button kind="secondary" size="sm" onClick={() => onOpen({ kind: "guard", state: guard.state })}>
            Request state support
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function Declaration({ row, selected, onOpen }: { readonly row: DeclarationRow; readonly selected: boolean; readonly onOpen: Open }) {
  const root = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    // A door that names this declaration lands below the incidents; bring it into view rather than leave it under the fold.
    if (selected) root.current?.scrollIntoView({ block: "center" });
  }, [selected]);
  return (
    <li ref={root} className="declaration" data-closing={row.renewalOpen ? "true" : undefined} data-selected={selected ? "true" : undefined} aria-current={selected ? "true" : undefined}>
      <p className="declaration__head">
        <Icon name={row.cause === "armed-conflict" ? "conflict" : CONDITION_GLYPH[row.cause]} size={18} /> <strong>{row.where}</strong>, over {row.causeLabel.toLowerCase()}
      </p>
      <Gauge
        shape="meter"
        tone={row.renewalOpen ? "watch" : "reading"}
        label="Until it lapses"
        value={Math.max(0, row.weeksToLapse) / EMERGENCY_RENEWAL_TURNS}
        valueText={lapseWords(row.weeksToLapse)}
        caption={`Declared ${formatDate(row.declared)}. Lapses ${formatDate(row.lapses)} unless continued. ${row.renewalOpen ? "The continuation window is open." : `The continuation window opens in ${row.renewalOpensIn} weeks.`}`}
      />
      <p className="declaration__cost ui-valence-ink" data-valence="bad">
        Costs International Standing {formatSignedPoints(-row.weeklyCost)} pts this week{row.causeRunning ? "" : ". What it was declared over has ended"}.
      </p>
      <div className="declaration__acts">
        <Button kind="secondary" size="sm" onClick={() => onOpen({ kind: "renew", id: row.id })}>
          Continue it
        </Button>
        <Button kind="secondary" size="sm" onClick={() => onOpen({ kind: "end", id: row.id })}>
          End it
        </Button>
      </div>
    </li>
  );
}

function Declarations({ rows, selected, onOpen }: { readonly rows: readonly DeclarationRow[]; readonly selected: string | undefined; readonly onOpen: Open }) {
  // The selected declaration leads, so a door to it never lands behind "Show all".
  const ordered = useMemo(() => [...rows.filter((row) => row.id === selected), ...rows.filter((row) => row.id !== selected)], [rows, selected]);
  return (
    <section aria-labelledby="emergency-declared">
      <h2 id="emergency-declared" className="brief-section__title">
        <Icon name="order" size={20} /> Declarations and their status <span className="brief-section__count">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="brief-section__note">No emergency declaration is recorded. Review each incident and its available statutory route; a declaration is not blanket authority.</p>
      ) : (
        <Collection items={ordered} initial={4} noun="declarations" className="emergency__list" render={(row) => <Declaration key={row.id} row={row} selected={row.id === selected} onOpen={onOpen} />} />
      )}
    </section>
  );
}

export type EmergencyScreenProps = {
  readonly campaign: Campaign;
  /** The incident the President selected, kept in the address so Back and reload keep it. */
  readonly selected: string | undefined;
  readonly onSelect: (id: string | undefined) => void;
  /** The declaration a door named, kept in the address the same way. */
  readonly declaration?: string | undefined;
};

/**
 * Emergency powers: the summary, the incidents in the order to look at them,
 * the response open to the one selected, and the declarations in force with
 * their status, then the stability they bear on and what moved it. The map lifts the state of the incident chosen in the list.
 */
export function EmergencyScreen({ campaign, selected, onSelect, declaration }: EmergencyScreenProps) {
  const board = emergencyBoard(campaign);
  const incidents = useMemo(() => prioritizedIncidents(board), [board]);
  const acts = useAct(campaign);
  const [open, setOpen] = useState<EmergencyAct | undefined>();
  const chosen = selected ? incidents.find((row) => row.id === selected) : incidents[0];
  const guard = chosen?.state ? board.guard.find((row) => row.state === chosen.state) : undefined;
  const declared = board.declarations.find((row) => row.id === declaration);
  const close = () => {
    setOpen(undefined);
    acts.dismiss();
  };
  const lede = board.weeklyCost > 0 ? `Standing declarations cost International Standing ${formatSignedPoints(-board.weeklyCost)} pts this week.` : "Inspect active conditions, available declaration routes, resources and legal limits.";
  return (
    <Screen
      icon="caution"
      iconTone="red"
      title="Emergency"
      eyebrow="Nation · emergency powers"
      lede={lede}
      screenClass="workspace"
      measure="data"
      camera="us"
    >
      <div className="emergency">
        <Sheet open={open !== undefined || acts.done !== undefined} dismissible={!acts.busy} onClose={close} title="Presidential emergency action" placement="wide">
          {acts.done ? <ActDone done={acts.done} onBack={close} backLabel="Back to the board" /> : open ? <EmergencyActPanel key={JSON.stringify(open)} campaign={campaign} act={open} acts={acts} onClose={close} /> : null}
        </Sheet>
        <Summary board={board} incidents={incidents} />
        <div className="emergency-workspace">
          <Card role="region" aria-labelledby="emergency-incidents">
            <CardHeader>
              <h2 id="emergency-incidents" className="brief-section__title">
                <Icon name="active" size={20} /> Incidents by severity
              </h2>
              <p className="brief-section__note">Highest severity first. Selecting an incident keeps its geography, authority and response together.</p>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <EmptyState icon="emptyInbox" title="Nothing is running at home">
                  The simulation only offers a declaration for an active condition.
                </EmptyState>
              ) : (
                <Collection
                  items={incidents}
                  initial={6}
                  noun="incidents"
                  className="emergency__list"
                  render={(row) => <IncidentRow key={row.id} row={row} selected={row.id === chosen?.id} onSelect={onSelect} />}
                />
              )}
            </CardContent>
          </Card>
          <div className="emergency-workspace__context">
            <MapView title="Where conditions are running" lens="conditions" marks="incidents" camera="us" {...(chosen?.state ? { selection: `state:${chosen.state as string}` } : {})} height={280} note="State color shows the most severe running condition; gold identifies a declaration. The selected incident determines the response below." />
            {chosen ? <Response row={chosen} guard={guard} onOpen={setOpen} /> : incidents.length > 0 ? <p className="brief-section__note">Select an incident to see the scope, authority and resources open to you.</p> : null}
          </div>
        </div>
        <Declarations rows={board.declarations} selected={declared?.id} onOpen={setOpen} />
        <div className="emergency-evidence">
          <MetricReading campaign={campaign} metric="stability" titleId="emergency-stability" />
          <MetricActs campaign={campaign} metric="stability" titleId="emergency-stability-acts" title="What moved stability" empty="Nothing on the record has moved stability yet." />
        </div>
      </div>
    </Screen>
  );
}
