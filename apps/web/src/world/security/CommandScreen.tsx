import { Card } from "@admin/ui-web";
import { useEffect, useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import { POSTURE_WORDS, commandFile, place, type CommandFile, type CommandZoneForces } from "@admin/player-core";
import { Button, Collection, EmptyState, Sheet, Bar, BarRows, Stat, Icon } from "@admin/ui-web";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit } from "../../nation/economy/commit";
import { MapView } from "../../map/MapView";
import { Door } from "../../shell/Door";
import { AssetTextLine } from "../forces/AssetFigure";
import { figureWords } from "../forces/units";
import { Screen } from "../../shell/Screen";
import { FlagChip } from "../nation/CountryFigures";
import { CommandFacts } from "./Commands";
import { CommandActPanel, type CommandAct } from "./CommandActs";
import "../../nation/economy/economy.css";
import "../../nation/policy/policy.css";
import "../../washington/courts/courts.css";
import "./security.css";

function Header({ file }: { readonly file: CommandFile }) {
  const { card } = file;
  return (
    <Card role="region" className="nation-section" aria-labelledby="command-posture">
      <h2 id="command-posture" className="nation-section__title">
        <Icon name="shield" size={20} /> Posture and command
      </h2>
      <p className="command__head">
        <span className="ui-valence-chip" data-valence={card.effective === "routine" ? "good" : card.effective === "heightened" ? "watch" : "bad"}>
          <Icon name={card.effective === "routine" ? "favorable" : card.effective === "heightened" ? "caution" : "adverse"} size={16} />
          {POSTURE_WORDS[card.effective]}
        </span>
        {card.effective !== card.ordered || !card.hasArea ? (
          <span className="nation-note">
            {card.effective !== card.ordered ? `Ordered ${card.ordered}; held at ${card.effective} while engaged. ` : ""}
            {card.hasArea ? "" : "This command holds no map."}
          </span>
        ) : null}
      </p>
      <p className="ledger__line command__facts">
        <span>
          <Icon name="subjectPerson" size={16} /> {card.commander ? `${card.commander.name}${card.commander.acting ? ", acting commander" : ""}, ${card.commander.service}` : "No commander"}
        </span>
        <span>
          <Icon name="mapPin" size={16} /> {file.headquarters}
        </span>
      </p>
      <p className="nation-note">{card.mission}</p>
      <Stat layout="comparison" label="Order carried out" value={`${Math.round(card.chain * 100)}%`} tone={card.chain < 0.7 ? "bad" : card.chain < 0.9 ? "watch" : "good"} reading={<Bar value={card.chain} tone={card.chain < 0.7 ? "bad" : card.chain < 0.9 ? "watch" : "good"} />} period={file.chainBreaks.length > 0 ? file.chainBreaks.join(" ") : "The chain from you to the theater is whole."} />
      {file.engagedAgainst.length + file.engagedToward.length > 0 ? (
        <p className="nation-note">
          Engaged{file.engagedAgainst.length > 0 ? ` against ${file.engagedAgainst.join(", ")}` : ""}
          {file.engagedToward.length > 0 ? `${file.engagedAgainst.length > 0 ? "; forces committed toward " : " with forces committed toward "}${file.engagedToward.join(", ")}` : ""}.
        </p>
      ) : null}
      {file.reliefs > 0 ? <p className="nation-note">You have relieved {file.reliefs} {file.reliefs === 1 ? "commander" : "commanders"} here, and each one slows an order through the chain.</p> : null}
    </Card>
  );
}

function Zone({ zone }: { readonly zone: CommandZoneForces }) {
  return (
    <li className="market-card">
      <p className="nation-subtitle">{zone.name}</p>
      <Collection
        items={zone.rows}
        initial={6}
        noun="placements"
        className="ledger__plain ledger__plain--glyph"
        render={(row) => (
          <li key={row.id}>
            <Icon name={row.precision === "installation" ? "mapPin" : "layerBlocs"} size={16} /> <strong>{row.precision === "installation" ? row.label : "Zone-level placement"}</strong>: {row.what}
            {row.service ? `, ${row.service}` : ""}
            {row.band ? `, ${row.band}` : ""}
            {row.precision === "zone" ? ". Drawn somewhere inside the zone, never at a site." : ""}
            {row.asset ? (
              <>
                {" "}
                <AssetTextLine unitType={row.asset.unitType} text={figureWords(row.asset.unitType, row.asset.count)} />
              </>
            ) : null}
          </li>
        )}
      />
    </li>
  );
}

function Forces({ file }: { readonly file: CommandFile }) {
  return (
    <Card role="region" className="nation-section" aria-labelledby="command-forces">
      <h2 id="command-forces" className="nation-section__title">
        <Icon name="mapPin" size={20} /> Forces by zone and base
      </h2>
      {file.zones.length === 0 ? (
        <EmptyState icon="emptyRecord" title="No force stands in this area">
          Deployments and basing in {file.card.abbr}&rsquo;s area appear here, and on the map, when you commit them.
        </EmptyState>
      ) : (
        <ul className="ledger">
          {file.zones.map((zone) => (
            <Zone key={zone.zone} zone={zone} />
          ))}
        </ul>
      )}
      <CommandFacts card={file.card} rows={false} />
      {file.assignment.length > 0 ? (
        <>
          <h3 className="nation-subtitle">Assigned from each service</h3>
          <p className="nation-note">Share of each service’s total force assigned to {file.card.abbr}. Common scale: 0–100%.</p>
          <BarRows label={`Service forces assigned to ${file.card.abbr}`} labelWidth="8rem" rows={file.assignment.map((row) => ({ id: row.branch, label: row.label, value: row.share, figure: `${Math.round(row.share * 100)}%`, spoken: `${row.label}: ${Math.round(row.share * 100)}% of its total force assigned to ${file.card.abbr}` }))} />
        </>
      ) : null}
    </Card>
  );
}

function Area({ file }: { readonly file: CommandFile }) {
  return (
    <Card role="region" className="nation-section" aria-labelledby="command-area">
      <h2 id="command-area" className="nation-section__title">
        <Icon name="world" size={20} /> Its area
      </h2>
      {file.nations.length === 0 ? (
        <p className="nation-note">No country or sea is assigned to this command.</p>
      ) : (
        <Collection
          items={file.nations}
          initial={12}
          noun="countries"
          className="area"
          render={(nation) => (
            <li key={nation.id}>
              <FlagChip nation={nation.id as string} name={nation.name} href={place.country(nation.id as string)} />
            </li>
          )}
        />
      )}
      {file.amendments.length > 0 ? (
        <ul className="ledger__plain">
          {file.amendments.map((row) => (
            <li key={`${row.nation}-${row.date}`}>
              {row.date}: {row.nation} moved from {row.from} to {row.to}. {row.rationale}
            </li>
          ))}
        </ul>
      ) : null}
      {file.missions.length > 0 ? <p className="nation-note">Standing missions: {file.missions.join("; ")}.</p> : null}
    </Card>
  );
}

const ACTS: readonly { readonly act: CommandAct; readonly label: string }[] = [
  { act: "posture", label: "Set posture" },
  { act: "relieve", label: "Relieve the commander" },
  { act: "reassign", label: "Reassign forces" },
  { act: "amend", label: "Amend the plan" },
];

function Doors({ file, onOpen }: { readonly file: CommandFile; readonly onOpen: (act: CommandAct) => void }) {
  return (
    <Card role="region" className="nation-section" aria-labelledby="command-acts">
      <h2 id="command-acts" className="nation-section__title">
        <Icon name="sign" size={20} /> What you can do
      </h2>
      <div className="command__acts">
        {ACTS.filter((entry) => file.card.hasArea || entry.act !== "amend").map((entry) => (
          <Button key={entry.act} kind="secondary" size="sm" onClick={() => onOpen(entry.act)}>
            {entry.label}
          </Button>
        ))}
      </div>
      <Door href="/world/security" className="nation-jumps__link">
        Back to the security desk
      </Door>
    </Card>
  );
}

/** One combatant command: its area lifted on the map, its zones and anchors, and the four acts on it. */
export function CommandScreen({ campaign, id, action, onAction }: { readonly campaign: Campaign; readonly id: string; readonly action?: CommandAct; readonly onAction?: (action: CommandAct | undefined) => void }) {
  const file = commandFile(campaign, id);
  const acts = useNationCommit(campaign);
  const [localAction, setLocalAction] = useState<CommandAct | undefined>();
  const open = onAction ? action : localAction;
  const setOpen = (next: CommandAct | undefined) => { acts.dismiss(); if (onAction) onAction(next); else setLocalAction(next); };
  const dismiss = useRef(acts.dismiss);
  dismiss.current = acts.dismiss;
  useEffect(() => { if (!open) dismiss.current(); }, [open]);
  const close = () => {
    setOpen(undefined);
  };
  if (!file) {
    return (
      <Screen title="Command" eyebrow="World · security" screenClass="workspace" camera="keep">
        <EmptyState icon="emptyRecord" title="No such command">
          No combatant command carries that name.
        </EmptyState>
        <Door href="/world/security" className="nation-jumps__link">
          Back to the security desk
        </Door>
      </Screen>
    );
  }
  return (
    <Screen
      title={file.card.abbr}
      icon="shield"
      eyebrow="World · security · combatant command"
      lede={file.card.name}
      screenClass="workspace"
      camera="keep"
    >
      <div className="nation-room security">
        <Sheet open={Boolean(open)} onClose={close} placement="wide" title={`${file.card.abbr} · ${ACTS.find((entry) => entry.act === open)?.label ?? "Command action"}`} dismissible={!acts.busy}>
          {acts.committed ? <ActReceipt committed={acts.committed} again={`Back to ${file.card.abbr}`} onAgain={close} mapNote={null} /> : open ? <CommandActPanel key={open} act={open} campaign={campaign} file={file} acts={acts} onClose={close} /> : null}
        </Sheet>
            <Header file={file} />
            <MapView title={`${file.card.abbr}'s area`} lens="forces" marks="forces" camera={file.camera} {...(file.selection ? { selection: file.selection } : {})} height={380}
              note="The command's governments lifted from the rest, each shaded by the US forces it hosts. Open one to see its file." />
            <Doors file={file} onOpen={setOpen} />
            <Forces file={file} />
            <Area file={file} />
      </div>
    </Screen>
  );
}
