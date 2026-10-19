import { PLAN_REASONS, RELIEF_REASONS } from "./security-options";
import { useMemo, useState } from "react";
import type { Campaign, CombatantCommandId, CommandPosture } from "@admin/engine";
import type { MilitaryBranch, NationId } from "@admin/world";
import {
  POSTURE_WORDS,
  REASSIGN_SHARES,
  amendChoices,
  amendOrder,
  branchName,
  commandCards,
  postureChoices,
  postureOfChoice,
  postureOrder,
  reassignChoices,
  reassignOrder,
  reliefChoices,
  reliefOrder,
  type CommandFile,
} from "@admin/player-core";
import { Choice, Field } from "@admin/ui-web";
import type { NationCommit } from "../../nation/economy/commit";
import { ActFrame } from "./ActFrame";

/** The act the player has open on a command, if any. */
export type CommandAct = "posture" | "relieve" | "reassign" | "amend";

type PanelProps = { readonly campaign: Campaign; readonly file: CommandFile; readonly acts: NationCommit; readonly onClose: () => void };

const pct = (share: number): string => `${Math.round(share * 100)}%`;

/** Raising or lowering what the theater stands at. */
function PosturePanel({ campaign, file, acts, onClose }: PanelProps) {
  const { abbr, id } = file.card;
  return (
    <ActFrame
      tier="full"
      title={`Set ${abbr}'s posture`}
      table={postureChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      verb={(selected) => `Order ${POSTURE_WORDS[postureOfChoice(selected) ?? "routine"].toLowerCase()}`}
      review={(selected) => `${abbr} goes to ${(postureOfChoice(selected) ?? "routine") === "routine" ? "routine, or heightened while it is engaged" : (postureOfChoice(selected) ?? "routine")} this week. The readiness bill is charged every week it stands.`}
      commission={(selected) => {
        const posture: CommandPosture = postureOfChoice(selected) ?? "routine";
        return {
          title: `${abbr} ordered to ${posture}`,
          lines: [
            { label: "Before", value: POSTURE_WORDS[file.card.ordered] },
            { label: "Now", value: POSTURE_WORDS[posture] },
          ],
          packet: () => postureOrder(campaign, id, posture),
        };
      }}
    />
  );
}

/** Relieving the commander, with the reason the Record keeps. */
function ReliefPanel({ campaign, file, acts, onClose }: PanelProps) {
  const { abbr, id, commander } = file.card;
  const [reason, setReason] = useState("");
  return (
    <ActFrame
      tier="full"
      title={`Relieve ${commander?.name ?? `the commander of ${abbr}`}`}
      table={reliefChoices(campaign, id, reason)}
      acts={acts}
      onClose={onClose}
      tone="danger"
      verb={() => "Relieve the commander"}
      review={() => `The deputy takes acting command today. ${commander?.name ?? "The commander"} reverts to a permanent grade and stays in the service.`}
      commission={() => ({
        title: `${commander?.name ?? "The commander"} relieved of ${abbr}`,
        lines: [{ label: "Your reason", value: reason.trim() }],
        packet: () => reliefOrder(campaign, id, reason.trim()),
      })}
    >
      <Choice legend="Reason for relief" layout="cards" value={reason} onChange={setReason} hint="Choose your stated rationale. This records your judgment; it does not establish misconduct or a finding of fact." options={RELIEF_REASONS.map((value) => ({ value, label: value }))} />
    </ActFrame>
  );
}

/** Moving a share of one service's force from this command to another. */
function ReassignPanel({ campaign, file, acts, onClose }: PanelProps) {
  const { abbr, id } = file.card;
  const others = useMemo(() => commandCards(campaign).filter((card) => card.id !== id), [campaign, id]);
  const branches = file.assignment.map((row) => row.branch);
  const [to, setTo] = useState<CombatantCommandId>(others[0]?.id ?? id);
  const [branch, setBranch] = useState<MilitaryBranch>(branches[0] ?? "army");
  const [share, setShare] = useState<string>(String(REASSIGN_SHARES[1]));
  const amount = Number(share);
  const target = others.find((card) => card.id === to) ?? others[0];
  return (
    <ActFrame
      tier="full"
      title={`Reassign forces from ${abbr}`}
      table={target ? reassignChoices(campaign, id, target.id, branch, amount) : undefined}
      acts={acts}
      onClose={onClose}
      verb={() => "Reassign the forces"}
      review={() => `${pct(amount)} of the ${branchName(branch)} force assigned to ${abbr} is assigned to ${target?.abbr ?? "the other command"} from today. The Secretary of Defense signs.`}
      commission={() => ({
        title: `${pct(amount)} of the ${branchName(branch)} moved from ${abbr} to ${target?.abbr ?? ""}`,
        lines: [{ label: "Service", value: branchName(branch) }, { label: "Share of its force", value: pct(amount) }],
        packet: () => reassignOrder(campaign, id, target?.id ?? id, branch, amount),
      })}
    >
      <Field label="Give them to">
        {(props) => (
          <select {...props} className="ui-input" value={target?.id ?? ""} onChange={(event) => setTo(event.target.value as CombatantCommandId)}>
            {others.map((card) => (
              <option key={card.id} value={card.id}>
                {`${card.abbr}: ${card.name}`}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Which service">
        {(props) => (
          <select {...props} className="ui-input" value={branch} onChange={(event) => setBranch(event.target.value as MilitaryBranch)}>
            {branches.map((entry) => (
              <option key={entry} value={entry}>
                {branchName(entry)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Choice legend="How much of that service's force" value={share} onChange={setShare} options={REASSIGN_SHARES.map((entry) => ({ value: String(entry), label: pct(entry) }))} />
    </ActFrame>
  );
}

/** Moving a country from this command's map to another's. */
function AmendPanel({ campaign, file, acts, onClose }: PanelProps) {
  const { abbr, id } = file.card;
  const countries = file.nations.filter((nation) => nation.id !== campaign.founding.nation);
  const others = useMemo(() => commandCards(campaign).filter((card) => card.id !== id && card.hasArea), [campaign, id]);
  const [nation, setNation] = useState<NationId | undefined>(undefined);
  const [to, setTo] = useState<CombatantCommandId | undefined>(undefined);
  const [reason, setReason] = useState("");
  const moved = nation ?? countries[0]?.id;
  const target = others.find((card) => card.id === to) ?? others[0];
  const name = countries.find((entry) => entry.id === moved)?.name ?? "";
  return (
    <ActFrame
      tier="full"
      title={`Amend the Unified Command Plan from ${abbr}`}
      table={moved && target ? amendChoices(campaign, moved, target.id, reason) : undefined}
      acts={acts}
      onClose={onClose}
      verb={() => "Amend the plan"}
      review={() => `${name} moves to ${target?.abbr ?? ""}'s map from today. Geography does not move, only whose map it is on.`}
      commission={() => ({
        title: `${name} moved from ${abbr} to ${target?.abbr ?? ""}`,
        lines: [{ label: "Your reason", value: reason.trim() }],
        packet: () => amendOrder(campaign, moved!, target!.id, reason.trim()),
      })}
    >
      <Field label="Which country">
        {(props) => (
          <select {...props} className="ui-input" value={moved ?? ""} onChange={(event) => setNation(event.target.value as NationId)}>
            {countries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Move it to">
        {(props) => (
          <select {...props} className="ui-input" value={target?.id ?? ""} onChange={(event) => setTo(event.target.value as CombatantCommandId)}>
            {others.map((card) => (
              <option key={card.id} value={card.id}>
                {`${card.abbr}: ${card.name}`}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Choice legend="Reason for command plan change" layout="cards" value={reason} onChange={setReason} hint="The selected planning rationale is kept with the dated amendment." options={PLAN_REASONS.map((value) => ({ value, label: value }))} />
    </ActFrame>
  );
}

/** The panel for the act the player has open on this command. */
export function CommandActPanel({ act, ...props }: PanelProps & { readonly act: CommandAct }) {
  switch (act) {
    case "posture":
      return <PosturePanel {...props} />;
    case "relieve":
      return <ReliefPanel {...props} />;
    case "reassign":
      return <ReassignPanel {...props} />;
    case "amend":
      return <AmendPanel {...props} />;
  }
}
