import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { actOption, actWorkspace, buildAct, buildTariffPackage, formatMoney, pendingAbout, readTariffPackage, standingToward, type ActConfig, type ActGoal, type ActWorkspace as Workspace, type TariffGood } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Button, Column, Page, Row, Section, SectionNav, Text, View, scrollToSection, useMedia } from "@admin/ui";
import { useDraftState, useDraftStore } from "../../device/hooks";
import { BackButton } from "../../shell/BackButton";
import { openDrafts } from "../../shell/Drafts";
import { authorizationSummary } from "../act-summary";
import { actAuthorities } from "../law";
import { FlagOf, Problem } from "../parts";
import { countryReturnHref, type CountrySearch } from "../params";
import { NoSuchNation } from "../nation/NationScreen";
import { ActReceipt } from "./ActReceipt";
import { useActCommit, type ActCommit } from "./commit";
import { OptionBrowser, type OptionHandlers } from "./OptionList";
import { PlanPanel } from "./Plan";
import type { TariffPick } from "./PlanTerms";
import { moneyText } from "./readings";
import { Situation } from "./Situation";

// The act workspace for one government: where things stand, every option
// from every goal, the plan for the one being set, and a bar at the foot that
// always says what is picked and what comes next. Its verb opens the one
// presidential review. Not acting needs no control: approving nothing is it.

function lede(campaign: Campaign, nation: NationId): string {
  const standing = standingToward(campaign, nation);
  const theirs = standing?.theirs ? `How they see you: ${standing.theirs.trust.word.toLowerCase()}.` : "We don't know yet how they see you.";
  const tension = standing?.tension ? ` Tension between you: ${standing.tension.word.toLowerCase()}.` : "";
  return `${theirs}${tension}`;
}

type DockProps = { readonly campaign: Campaign; readonly nation: NationId; readonly view: Workspace; readonly config: ActConfig; readonly act: ActCommit; readonly onCompare: () => void; readonly tariff?: TariffPick };

/** What is picked, the next step in words, and the one verb, pinned to the foot of the screen. */
function Dock({ campaign, nation, view, config, act, onCompare, tariff }: DockProps) {
  const media = useMedia();
  const drafts = useDraftStore();
  const { drafts: inTray } = useDraftState();
  const [drafting, setDrafting] = useState("");
  const drafted = tariff !== undefined && inTray.some((entry) => entry.subject === `tariff:${nation}`);
  const chosen = view.chosen;
  const assessment = view.assessment;
  // A tariff order on several goods is signed as one package; on one good it is the ordinary act.
  const several = tariff && tariff.picked.length > 1 ? tariff : undefined;
  const ready = chosen?.preview.state === "open" && assessment && !assessment.locked && (!several || (several.reading?.ordered ?? 0) > 0);
  const next = !chosen ? (view.compared.length > 1 ? "Options checked for comparison" : "No option in the plan") : chosen.preview.state !== "open" ? "Locked. Its way in is in the plan" : assessment?.locked ? assessment.locked : "Ready to review";
  const authorize = () => {
    if (!chosen || !assessment) return;
    // An order already in the drafts is signed there, so it cannot also be signed here and left waiting to be signed again.
    if (drafted) {
      void draft(nation);
      return;
    }
    const law = actAuthorities(chosen.option, view.terms.tariff?.law.statute);
    // The weekly bill goes on the cost line, so the review never shows a recurring act at its first charge alone.
    const weekly = chosen.preview.money?.weekly ? ` Then ${formatMoney(chosen.preview.money.weekly)} a week while it lasts.` : "";
    const lines = authorizationSummary({ name: view.name, chosen, terms: view.terms, assessment }).map((line) => ({ label: line.label, value: `${line.basis ? `${line.value}. ${line.basis}` : line.value}${line.label === "Cost" ? weekly : ""}` }));
    const laws = law.length > 0 ? [{ label: law.length === 1 ? "Law" : "Laws", value: law.map((authority) => `${authority.title} (${authority.cite})`).join("; ") }] : [];
    if (several) {
      const built = buildTariffPackage(campaign, nation, several.picked, config.statute);
      const goods = built.ok ? built.lines.map((line) => ({ label: line.label, value: line.value })) : [];
      void act.take(() => buildTariffPackage(campaign, nation, several.picked, config.statute), { tier: "full", title: `Tariff order on ${several.picked.length} kinds of goods from ${view.name}`, lines: [{ label: "Country", value: view.name }, ...goods, ...laws], verb: assessment.verb, danger: false });
      return;
    }
    void act.take(() => buildAct(campaign, nation, chosen.option, config), { tier: "full", title: assessment.title, lines: [...lines, ...laws], verb: assessment.verb, danger: assessment.tone === "danger" });
  };
  // A tariff order is an executive act that takes effect on signing, so it can wait in the drafts beside a budget before it is signed on its own.
  const draft = async (signing?: string) => {
    if (!tariff) return;
    const outcome = await drafts.put({ kind: "tariff", nation, goods: tariff.picked, ...(config.statute ? { statute: config.statute } : {}) });
    if (!outcome.ok) {
      setDrafting(outcome.reason);
      return;
    }
    setDrafting("");
    openDrafts(signing ? `tariff:${signing}` : undefined);
  };
  return (
    <View role="region" aria-label="Your plan" backgroundColor="chromeBackground" borderTopWidth={3} borderTopColor="goldRule" paddingHorizontal={media.phone ? "lg" : "xl"} paddingVertical="sm">
      <Row gap="md" between maxWidth={1680} width="100%" alignSelf="center">
        <Column flex={1} minWidth={0} gap="2xs" aria-live="polite">
          <Text variant="label" color="chromeColor" numberOfLines={1}>
            {chosen ? `${chosen.option.name}${several?.reading ? ` · ${several.picked.length} goods · +${formatMoney(several.reading.revenue)} a year` : chosen.preview.state === "open" ? ` · ${moneyText(chosen.preview.money)}` : ""}` : view.compared.length > 0 ? `${view.compared.length} checked to compare` : "Nothing picked yet"}
          </Text>
          <Text variant="caption" color={drafting ? "danger" : "chromeSecondary"} numberOfLines={media.phone ? 2 : 1}>
            {act.busy ? "Working…" : drafting || `Next: ${next}`}
          </Text>
        </Column>
        {ready && tariff ? (
          <Button kind="secondary" size={media.phone ? "compact" : "large"} icon="sign" disabled={act.busy} label="Add this tariff order to your drafts, to sign later" onPress={() => void draft()}>
            {media.phone ? "Draft" : "Add to drafts"}
          </Button>
        ) : null}
        {ready ? (
          <Button kind={assessment.tone === "danger" ? "danger" : "primary"} size={media.phone ? "compact" : "large"} icon="sign" disabled={act.busy} label={`${assessment.verb}. You'll see one last review, and nothing happens until you confirm.`} onPress={authorize}>
            {media.phone ? "Review" : `Review: ${assessment.verb}`}
          </Button>
        ) : view.compared.length > 1 ? (
          <Button kind="secondary" size="compact" icon="review" onPress={onCompare}>
            {`Compare ${view.compared.length}`}
          </Button>
        ) : null}
      </Row>
    </View>
  );
}

export type ActWorkspaceProps = {
  readonly campaign: Campaign;
  readonly id: NationId;
  readonly config: ActConfig;
  /** Replaces the address's settings: picking an option starts its terms over. */
  readonly onConfig: (next: ActConfig) => void;
  /** Validated, same-government dossier context; never execution terms. */
  readonly origin?: CountrySearch;
};

export function ActWorkspace({ campaign, id, config, onConfig, origin }: ActWorkspaceProps) {
  const act = useActCommit(campaign, id);
  const [checkedOnly, setCheckedOnly] = useState(false);
  const key = JSON.stringify(config);
  // A several-goods order prices its first good as the option's own reading.
  const first = config.goods?.[0];
  const priced: ActConfig = first ? { ...config, sector: first.sector, rate: first.rate } : config;
  // Every option is priced once per board and setting; the view re-reads only when either changes.
  const view = useMemo(() => actWorkspace(campaign, id, priced), [campaign, id, key]);
  const taxes = actOption(config.option)?.ref.kind === "tariff";
  const picked: readonly TariffGood[] = taxes ? (config.goods ?? (view?.terms.tariff ? [{ sector: view.terms.tariff.sector, rate: view.terms.tariff.rate }] : [])) : [];
  const reading = useMemo(() => (picked.length > 0 ? readTariffPackage(campaign, id, picked, config.statute) : undefined), [campaign, id, JSON.stringify(picked), config.statute]);
  if (!view) return <NoSuchNation />;
  // An order keeps at least one good; the first is also the option's own sector and rate.
  const onGoods = (goods: readonly TariffGood[]) => (goods.length > 0 ? onConfig({ ...config, goods, sector: undefined, rate: undefined }) : undefined);
  const tariff: TariffPick | undefined = taxes ? { picked, ...(reading ? { reading } : {}), onGoods } : undefined;
  if (act.done) return <ActReceipt nation={id} name={view.name} done={act.done} {...(view.then ? { then: view.then.option } : {})} {...(origin ? { origin } : {})} />;
  const compare = view.compared.map((entry) => entry.option.id);
  const keep = { ...(config.goal ? { goal: config.goal } : {}), ...(compare.length ? { compare } : {}) };
  const handlers: OptionHandlers = {
    chosen: view.chosen?.option.id,
    checked: new Set(compare),
    onPick: (option) => {
      onConfig({ ...keep, option, ...(config.then ? { then: config.then } : {}) });
      scrollToSection("act-plan");
    },
    onCheck: (option) => onConfig({ ...config, compare: compare.includes(option) ? compare.filter((entry) => entry !== option) : [...compare, option] }),
    onFirst: (builder, locked) => {
      onConfig({ ...keep, option: builder, then: locked });
      scrollToSection("act-plan");
    },
  };
  const onGoal = (goal: ActGoal | undefined) => {
    setCheckedOnly(false);
    const rest: ActConfig = { ...config, goal: undefined };
    onConfig(goal ? { ...rest, goal } : rest);
  };
  const showChecked = () => {
    setCheckedOnly(true);
    scrollToSection("act-options");
  };
  const open = view.goals.reduce((sum, goal) => sum + goal.open, 0);
  const initial = config.manage ? "act-situation" : config.option ? "act-plan" : undefined;
  // What is waiting on an answer here marks the section, so the eye finds the countdowns before the options.
  const waiting = pendingAbout(campaign, `nation:${view.nation}`).length;
  const standing = view.underway.filter((row) => row.kind === "measure").length + waiting;
  return (
    <Column flex={1}>
      <Page wide eyebrow="Foreign government" icon="dispatch" title={view.name} lede={lede(campaign, id)} emblem={<FlagOf nation={id} name={view.name} height={40} />} actions={<BackButton parent={countryReturnHref(id, origin ?? {})} parentLabel={view.name} />}>
        <SectionNav label="Parts of this page" items={[{ id: "act-situation", label: "Where things stand", icon: "layerTrust", count: standing }, { id: "act-options", label: "Options", icon: "dispatch", count: open }, { id: "act-plan", label: "Plan", icon: "sign" }]} {...(initial ? { initial } : {})} />
        <Section id="act-situation" icon="layerTrust" title="Where things stand" waiting={waiting} helper={`How ${view.name} sees you, and what you already have moving.`}>
          <Situation campaign={campaign} nation={id} name={view.name} underway={view.underway} {...(config.manage ? { focus: config.manage } : {})} act={act} />
        </Section>
        <Section id="act-options" icon="dispatch" title="Your options" helper="Every option you have toward this country, from a phone call to force.">
          <OptionBrowser view={view} handlers={handlers} lens={{ goal: config.goal, checkedOnly }} onGoal={onGoal} onCheckedOnly={(on) => (on ? showChecked() : setCheckedOnly(false))} />
        </Section>
        <Section id="act-plan" icon="sign" title={view.chosen ? `Plan: ${view.chosen.option.name}` : "Plan"} helper={view.chosen ? `The terms and expected consequences of ${view.chosen.option.name.toLowerCase()}.` : "No option is in the plan yet."}>
          <PlanPanel campaign={campaign} nation={id} view={view} config={priced} onConfig={onConfig} {...(tariff ? { tariff } : {})} />
          <Problem problem={act.problem} />
        </Section>
      </Page>
      <Dock campaign={campaign} nation={id} view={view} config={priced} act={act} onCompare={showChecked} {...(tariff ? { tariff } : {})} />
    </Column>
  );
}
