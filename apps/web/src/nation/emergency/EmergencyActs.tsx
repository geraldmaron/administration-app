import { useEffect, useMemo, useRef, useState } from "react";
import { createRngStreams, declareEmergency, endEmergency, hazardLabel, renewEmergency, requestGuardFederalization, type Campaign } from "@admin/engine";
import {
  declarationChoices,
  endChoices,
  guardChoices,
  renewChoices,
  scopeCamera,
  scopeOfChoice,
  scopeWords,
  type ChoiceTable,
} from "@admin/player-core";
import { Button } from "@admin/ui-web";
import type { StateId } from "@admin/world";
import { ChoiceCompare } from "../policy/ChoiceCompare";
import type { ActHandle, BuiltAct } from "../policy/use-act";

/** The emergency act the player has open, if any. */
export type EmergencyAct =
  | { readonly kind: "declare"; readonly conditionId: string }
  | { readonly kind: "renew"; readonly id: string }
  | { readonly kind: "end"; readonly id: string }
  | { readonly kind: "guard"; readonly state: StateId };

type ActSpec = {
  readonly title: string;
  readonly table: ChoiceTable;
  readonly verb: (selected: string) => string;
  readonly tone: "commit" | "danger";
  readonly review: (selected: string) => string;
  readonly build: (selected: string) => BuiltAct;
};

function refused(reason: string): never {
  throw new Error(`It was refused: ${reason}.`);
}

function declareSpec(campaign: Campaign, conditionId: string): ActSpec | undefined {
  const table = declarationChoices(campaign, conditionId);
  const condition = campaign.conditions[conditionId];
  if (!table || !condition) return undefined;
  return {
    title: `Declare an emergency over the ${hazardLabel(condition.kind).toLowerCase()}${condition.state ? ` in ${scopeWords({ kind: "state", state: condition.state })}` : ""}`,
    table,
    verb: () => "Declare the emergency",
    tone: "danger",
    review: (selected) => {
      const scope = scopeOfChoice(selected);
      const where = scope?.kind === "state" ? `in ${scopeWords(scope)}` : "across the whole country";
      return `You will declare a state of emergency ${where}. It costs standing every week it stands, and lapses in a year unless you continue it.`;
    },
    build: (selected) => {
      const scope = scopeOfChoice(selected) ?? refused("pick where it reaches");
      const result = declareEmergency(campaign, scope, condition.kind);
      if (!result.ok) refused(result.reason);
      const where = scope.kind === "nation" ? "nationwide" : `in ${scopeWords(scope)}`;
      return { packet: result.packet, title: `Declared: a state of emergency ${where}`, camera: scopeCamera(scope), lines: [{ label: "Reaches", value: scope.kind === "state" ? scopeWords(scope) : "The whole country" }] };
    },
  };
}

function declarationSpec(campaign: Campaign, act: Extract<EmergencyAct, { kind: "renew" | "end" }>): ActSpec | undefined {
  const emergency = campaign.emergencies[act.id];
  const table = act.kind === "end" ? endChoices(campaign, act.id) : renewChoices(campaign, act.id);
  if (!emergency || !table) return undefined;
  const where = scopeWords(emergency.scope);
  const ending = act.kind === "end";
  return {
    title: `${ending ? "End" : "Continue"} the emergency: ${where}`,
    table,
    verb: () => (ending ? "End the emergency" : "Continue it a year"),
    tone: "commit",
    review: () => (ending ? "You will end this declaration and its weekly charge. Separate disaster declarations, signed orders and obligations keep their own legal status." : "You will publish the continuation. It stands another year, and goes on costing standing every week."),
    build: () => {
      const result = ending ? endEmergency(campaign, act.id) : renewEmergency(campaign, act.id);
      if (!result.ok) refused(result.reason);
      return { packet: result.packet, title: ending ? `Ended: the emergency in ${where}` : `Continued: the emergency in ${where}`, camera: scopeCamera(emergency.scope) };
    },
  };
}

function guardSpec(campaign: Campaign, state: StateId): ActSpec | undefined {
  const table = guardChoices(campaign, state);
  if (!table) return undefined;
  const name = scopeWords({ kind: "state", state });
  return {
    title: `Ask ${name}'s governor for the Guard`,
    table,
    verb: () => "Ask the governor",
    tone: "commit",
    review: () => `You will ask the governor of ${name} to coordinate emergency support. The governor decides; consent does not itself federalize or deploy forces.`,
    build: () => {
      const result = requestGuardFederalization(campaign, state, createRngStreams(campaign.seed));
      if (!result.ok) refused(result.reason);
      const answer = result.consents ? "agreed to support coordination" : "refused";
      return { packet: result.packet, title: `Asked: the governor of ${name} ${answer}`, camera: scopeCamera({ kind: "state", state }), ...(result.consents ? {} : { outcome: "refused" as const }) };
    },
  };
}

/** The table, verb and commit for an open emergency act, or undefined when its subject has gone. */
export function actSpec(campaign: Campaign, act: EmergencyAct): ActSpec | undefined {
  if (act.kind === "declare") return declareSpec(campaign, act.conditionId);
  if (act.kind === "guard") return guardSpec(campaign, act.state);
  return declarationSpec(campaign, act);
}

/** One emergency act, its options read as changes from today, with the one verb and a way back to the board. */
export function EmergencyActPanel({ campaign, act, acts, onClose }: { readonly campaign: Campaign; readonly act: EmergencyAct; readonly acts: ActHandle; readonly onClose: () => void }) {
  const spec = useMemo(() => actSpec(campaign, act), [campaign, act]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => heading.current?.focus({ preventScroll: false }), []);
  if (!spec) {
    return (
      <section className="emergency-act" aria-labelledby="emergency-act-title">
        <h2 id="emergency-act-title" ref={heading} tabIndex={-1} className="emergency-act__title">
          This is no longer open
        </h2>
        <Button kind="ghost" size="sm" onClick={onClose}>
          Back to the board
        </Button>
      </section>
    );
  }
  return (
    <section className="emergency-act" aria-labelledby="emergency-act-title">
      <h2 id="emergency-act-title" ref={heading} tabIndex={-1} className="emergency-act__title">
        {spec.title}
      </h2>
      <ChoiceCompare
        title={spec.table.columns.length > 1 ? "Compare the options" : "What it would do"}
        table={spec.table}
        selected={selected}
        onSelect={setSelected}
        verb={spec.verb(selected ?? "")}
        tone={spec.tone}
        onAuthorize={() => selected && void acts.run(() => spec.build(selected), { tier: "full", title: spec.verb(selected), verb: "Confirm", danger: spec.tone === "danger" })}
        review={selected === undefined ? undefined : spec.review(selected)}
        busy={acts.busy}
      />
      {acts.problem ? (
        <p className="act-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
      <Button kind="ghost" size="sm" onClick={onClose}>
        Back to the board
      </Button>
    </section>
  );
}
