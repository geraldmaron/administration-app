import { useMemo, useState } from "react";
import type { Campaign, CombatantCommandId, CommandPosture } from "@admin/engine";
import type { MilitaryBranch, NationId } from "@admin/world";
import { POSTURE_WORDS, REASSIGN_SHARES, amendChoices, amendOrder, branchName, commandCards, postureChoices, postureOfChoice, postureOrder, reassignChoices, reassignOrder, reliefChoices, reliefOrder, type CommandFile } from "@admin/player-core";
import { ChoiceList, Field, Select } from "@admin/ui";
import type { WorldActs } from "../world/acts";
import { topicAuthorities } from "../world/law";
import { ChooseOne } from "../world/parts";
import { ActFrame } from "./ActFrame";
import { PLAN_REASONS, RELIEF_REASONS } from "./options";
import type { CommandAct } from "./params";

type PanelProps = { readonly campaign: Campaign; readonly file: CommandFile; readonly acts: WorldActs; readonly onClose: () => void };

const pct = (share: number): string => `${Math.round(share * 100)}%`;
const law = () => topicAuthorities("commands");

/** Raising or lowering what the theater stands at. */
function PosturePanel({ campaign, file, acts, onClose }: PanelProps) {
  const { abbr, id } = file.card;
  const postureOf = (selected: string): CommandPosture => postureOfChoice(selected) ?? "routine";
  return (
    <ActFrame
      tier="full"
      title={`Set ${abbr}'s alert level`}
      table={postureChoices(campaign, id)}
      acts={acts}
      onClose={onClose}
      law={law()}
      verb={(selected) => `Order ${POSTURE_WORDS[postureOf(selected)].toLowerCase()}`}
      review={(selected) => `${abbr} moves to ${postureOf(selected) === "routine" ? "routine, or heightened while it's in action" : postureOf(selected)} this week. Staying ready costs you every week it stays there.`}
      commission={(selected) => ({ title: `${abbr} ordered to ${postureOf(selected)}`, lines: [{ label: "Before", value: POSTURE_WORDS[file.card.ordered] }, { label: "Now", value: POSTURE_WORDS[postureOf(selected)] }], packet: () => postureOrder(campaign, id, postureOf(selected)) })}
    />
  );
}

/** Relieving the commander, with the reason the Record keeps. */
function ReliefPanel({ campaign, file, acts, onClose }: PanelProps) {
  const { abbr, id, commander } = file.card;
  const [reason, setReason] = useState("");
  const who = commander?.name ?? "The commander";
  return (
    <ActFrame
      tier="full"
      title={`Remove ${commander?.name ?? `the commander of ${abbr}`} from command`}
      table={reliefChoices(campaign, id, reason)}
      acts={acts}
      onClose={onClose}
      tone="danger"
      law={law()}
      verb={() => "Remove the commander"}
      review={() => `The deputy takes over as acting commander today. ${who} goes back to their permanent rank and stays in the military.`}
      commission={() => ({ title: `${who} removed from ${abbr}`, lines: [{ label: "Your reason", value: reason.trim() }], packet: () => reliefOrder(campaign, id, reason.trim()) })}
    >
      <ChoiceList label="Why you're removing them" help="Your stated reason records your judgment about this command." value={reason} onChange={setReason} options={RELIEF_REASONS.map((value) => ({ value, label: value }))} />
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
      title={`Move forces out of ${abbr}`}
      table={target ? reassignChoices(campaign, id, target.id, branch, amount) : undefined}
      acts={acts}
      onClose={onClose}
      law={law()}
      verb={() => "Move the forces"}
      review={() => `${pct(amount)} of the ${branchName(branch)} forces under ${abbr} move to ${target?.abbr ?? "the other command"} today. The Secretary of Defense signs the order.`}
      commission={() => ({ title: `${pct(amount)} of the ${branchName(branch)} moved from ${abbr} to ${target?.abbr ?? ""}`, lines: [{ label: "Service", value: branchName(branch) }, { label: "How much moved", value: pct(amount) }], packet: () => reassignOrder(campaign, id, target?.id ?? id, branch, amount) })}
    >
      <Field label="Move them to">{(control) => <Select {...control} label="Move them to" value={target?.id} onChange={(value) => setTo(value as CombatantCommandId)} options={others.map((card) => ({ value: card.id, label: `${card.abbr}: ${card.name}` }))} />}</Field>
      <Field label="Which service">{(control) => <Select {...control} label="Which service" value={branch} onChange={(value) => setBranch(value as MilitaryBranch)} options={branches.map((entry) => ({ value: entry, label: branchName(entry) }))} />}</Field>
      <ChooseOne label="How much of that service to move" value={share} onChange={setShare} options={REASSIGN_SHARES.map((entry) => ({ value: String(entry), label: pct(entry) }))} />
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
      title={`Move a country out of ${abbr}'s area`}
      table={moved && target ? amendChoices(campaign, moved, target.id, reason) : undefined}
      acts={acts}
      onClose={onClose}
      law={law()}
      verb={() => "Move the country"}
      review={() => `${name} moves into ${target?.abbr ?? ""}'s area today. The country itself doesn't change. Only the command in charge of it does.`}
      commission={() => ({
        title: `${name} moved from ${abbr} to ${target?.abbr ?? ""}`,
        lines: [{ label: "Your reason", value: reason.trim() }],
        packet: () => {
          if (!moved || !target) throw new Error("Pick a country and the command it should move to.");
          return amendOrder(campaign, moved, target.id, reason.trim());
        },
      })}
    >
      <Field label="Which country">{(control) => <Select {...control} label="Which country" value={moved as string | undefined} onChange={(value) => setNation(value as NationId)} options={countries.map((entry) => ({ value: entry.id as string, label: entry.name }))} />}</Field>
      <Field label="Move it to">{(control) => <Select {...control} label="Move it to" value={target?.id} onChange={(value) => setTo(value as CombatantCommandId)} options={others.map((card) => ({ value: card.id, label: `${card.abbr}: ${card.name}` }))} />}</Field>
      <ChoiceList label="Why you're moving it" help="Your reason is saved with the change and its date." value={reason} onChange={setReason} options={PLAN_REASONS.map((value) => ({ value, label: value }))} />
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
