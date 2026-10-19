import { useMemo, useState } from "react";
import type { Campaign, ConditionKind, EffectPacket, LocaleActId } from "@admin/engine";
import { homeActOptions, localeActOptions, localeMatters, type LocaleActOption } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { Badge, Button, Column, Icon, Pressable, ReadingFrame, Row, Text, View } from "@admin/ui";
import { Track } from "@admin/ui/nation";
import { BatchLines, type BatchLineView } from "../../batch/BatchLines";
import { buildSequential, type PackageLine } from "../../batch/package";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { toneKey } from "../keys";
import { COERCION_ICON, DONE_WORDS, VERBS, requestCell } from "../state/locale-acts";

/** The acts that mean the same thing in every state they are taken in; troops and surveillance stay one state at a time. */
const BATCHABLE: readonly LocaleActId[] = ["relief", "request-deployment", "federalize", "agents", "waiver", "review"];
const SKIP = "skip";

type StateLine = { readonly id: StateId; readonly name: string; readonly cause?: ConditionKind; readonly options: readonly LocaleActOption[] };

/** Each chosen state's acts against its own lead matter, or the federal forces it could be sent with none. */
function stateLines(campaign: Campaign, states: readonly StateId[]): readonly StateLine[] {
  return states.map((id) => {
    const cause = localeMatters(campaign, id)[0]?.cause;
    const options = (cause ? localeActOptions(campaign, id, cause) : homeActOptions(campaign, id)).filter((option) => BATCHABLE.includes(option.id));
    return { id, name: campaign.states[id]?.base.name ?? id, ...(cause ? { cause } : {}), options };
  });
}

function optionsAt(campaign: Campaign, line: Pick<StateLine, "id" | "cause">): readonly LocaleActOption[] {
  return line.cause ? localeActOptions(campaign, line.id, line.cause) : homeActOptions(campaign, line.id);
}

function Readings({ option, campaign, line }: { readonly option: LocaleActOption; readonly campaign: Campaign; readonly line: StateLine }) {
  const matter = line.cause ? localeMatters(campaign, line.id).find((entry) => entry.cause === line.cause) : undefined;
  return (
    <Column gap="2xs">
      <Row gap="xs" wrap>
        <Badge status="outline" icon="budget">
          {option.costText}
        </Badge>
        {option.assent ? (
          <Badge status="outline" icon="subjectPerson">
            {option.assent}
          </Badge>
        ) : null}
        {matter?.request ? <Badge status={option.answers ? "success" : "outline"}>{requestCell(option, matter)}</Badge> : null}
      </Row>
      {option.risk ? (
        <Row gap="sm">
          <Text variant="caption" tone="secondary" width={128}>
            Chance of an incident
          </Text>
          <View flex={1}>
            <Track value={option.risk.odds} tone={option.risk.odds >= 0.4 ? "bad" : "watch"} slim />
          </View>
          <Text variant="caption" weight="strong" tabular width={40} textAlign="right">
            {Math.round(option.risk.odds * 100)}%
          </Text>
        </Row>
      ) : null}
    </Column>
  );
}

/** The act set once for every chosen state: each a row saying how many of them it can go to. */
function KindChooser({ lines, kind, onKind }: { readonly lines: readonly StateLine[]; readonly kind: LocaleActId | undefined; readonly onKind: (kind: LocaleActId) => void }) {
  const kinds = BATCHABLE.filter((id) => lines.some((line) => line.options.some((option) => option.id === id)));
  if (kinds.length === 0) return <Text variant="caption" tone="secondary">None of these states has an act you can take together.</Text>;
  return (
    <Column gap="xs" role="radiogroup" aria-label="One act for every chosen state">
      {kinds.map((id) => {
        const open = lines.filter((line) => line.options.some((option) => option.id === id && !option.locked)).length;
        const name = lines.flatMap((line) => line.options).find((option) => option.id === id)?.name ?? VERBS[id];
        const on = id === kind;
        return (
          <Pressable key={id} role="radio" aria-checked={on} aria-label={`${name}. Open in ${open} of ${lines.length} states`} onPress={() => onKind(id)} flexDirection="row" alignItems="center" gap="sm" padding="sm" borderRadius="card" borderWidth={on ? 2 : 1} borderColor={on ? "accent" : "borderColor"} backgroundColor={{ default: on ? "infoFill" : "surface", hover: "surfaceHover" }}>
            <Icon name={COERCION_ICON[id] ?? "sign"} size={18} tone="gold" />
            <Text variant="label" flex={1}>
              {name}
            </Text>
            <Text variant="caption" tone={open === lines.length ? "success" : open === 0 ? "danger" : "warning"} weight="strong">
              {`${open} of ${lines.length} states`}
            </Text>
          </Pressable>
        );
      })}
    </Column>
  );
}

type Tuning = Readonly<Record<string, string>>;

/** Each line's act: the one tuned for it, else the one set for all. */
function lineAct(line: StateLine, kind: LocaleActId | undefined, tuning: Tuning): string | undefined {
  return tuning[line.id] ?? kind;
}

function viewOf(campaign: Campaign, line: StateLine, act: string | undefined): BatchLineView {
  const option = line.options.find((candidate) => candidate.id === act);
  const choices = line.options.filter((candidate) => !candidate.locked).map((candidate) => ({ id: candidate.id, label: candidate.name }));
  return {
    key: line.id,
    title: line.name,
    included: act !== SKIP,
    choices,
    ...(act && act !== SKIP ? { choice: act } : {}),
    ...(option ? { readings: <Readings option={option} campaign={campaign} line={line} /> } : {}),
    ...(act === SKIP ? {} : !option ? { blocked: "This act isn't open here. Pick another for this state or leave it out." } : option.locked ? { blocked: `Not available right now. ${option.locked}` } : {}),
  };
}

type Entry = PackageLine<{ readonly line: StateLine; readonly id: string }>;

/** Puts the package to one review and commits it as one run; each act is priced on the world the ones before it leave. */
function authorizePackage(act: NationAct, campaign: Campaign, chosen: readonly Entry[]): void {
  const priced = chosen.map((entry) => ({ entry, option: entry.terms.line.options.find((option) => option.id === entry.terms.id)! }));
  const count = chosen.length;
  void act.run(
    () => ({
      packet: buildSequential(campaign, chosen, (running, entry): EffectPacket => {
        const option = optionsAt(running, entry.terms.line).find((candidate) => candidate.id === entry.terms.id);
        if (!option?.packet) throw new Error(`${entry.label}: ${option?.locked ?? "this act can't be taken there any more."}`);
        return option.packet;
      }),
      title: `${count} federal ${count === 1 ? "act" : "acts"} authorized`,
      lines: priced.map(({ entry, option }) => ({ label: entry.label, value: `${DONE_WORDS[option.id]}. ${option.costText}.` })),
    }),
    {
      tier: "full",
      title: `${count} ${count === 1 ? "state" : "states"}, one package`,
      lines: priced.map(({ entry, option }) => ({ label: entry.label, value: `${option.name}. ${option.costText}.${option.assent ? ` ${option.assent}` : ""}${option.risk ? ` Chance of an incident ${Math.round(option.risk.odds * 100)}%.` : ""}` })),
      verb: `Authorize all ${count}`,
      danger: priced.some(({ option }) => COERCION_ICON[option.id] !== undefined),
    },
  );
}

/**
 * One federal act for several states at once: set it for all, tune or drop a
 * line, then review and authorize them together. The engine takes one state
 * per act, so the package is N acts priced in order and committed as one run
 * under one review.
 */
export function BatchActs({ campaign, states }: { readonly campaign: Campaign; readonly states: readonly StateId[] }) {
  const act = useNationAct(campaign);
  const lines = useMemo(() => stateLines(campaign, states), [campaign, states]);
  const [kind, setKind] = useState<LocaleActId | undefined>(undefined);
  const [tuning, setTuning] = useState<Tuning>({});
  if (act.done) return <Column gap="md">{act.layer}<ActDone done={act.done} onBack={act.dismiss} backLabel="Back to the chosen states" /></Column>;
  const views = lines.map((line) => viewOf(campaign, line, lineAct(line, kind, tuning)));
  const going = lines.filter((line, index) => views[index]!.included && !views[index]!.blocked && lineAct(line, kind, tuning));
  const authorize = () => authorizePackage(act, campaign, going.map((line) => ({ key: line.id, label: line.name, terms: { line, id: lineAct(line, kind, tuning)! } })));
  return (
    <Column gap="sm">
      {act.layer}
      <Text variant="label">One act for all of them</Text>
      <KindChooser lines={lines} kind={kind} onKind={(next) => { setKind(next); setTuning({}); }} />
      {kind ? (
        <ReadingFrame title="Chance of an incident, state by state" unit="% chance something goes wrong" legend={toneKey({ watch: "Under 40%", bad: "40% or more" })} help={{ meaning: "Each state's row shows the chance that the act goes wrong there, filled further for a worse chance. Whether it happens is shown on the receipt." }}>
          <BatchLines
            label="The chosen states"
            lines={views}
            onToggle={(key) => setTuning((was) => ({ ...was, [key]: was[key] === SKIP ? (kind ?? SKIP) : SKIP }))}
            onChoice={(key, choice) => setTuning((was) => ({ ...was, [key]: choice }))}
          />
        </ReadingFrame>
      ) : null}
      {kind ? (
        <Button kind="primary" icon="sign" block disabled={going.length === 0 || act.busy} onPress={going.length === 0 || act.busy ? undefined : authorize}>
          {going.length === 0 ? "Nothing can go yet" : `Review ${going.length} ${going.length === 1 ? "act" : "acts"}`}
        </Button>
      ) : null}
      <ActProblem problem={act.problem} />
    </Column>
  );
}
