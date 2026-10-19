import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import { actWorkspace, bilateralTradePartners, buildAct, type ActConfig } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Button, Icon, Sheet, Tag } from "@admin/ui-web";
import { institutionArtwork } from "../../media/authority";
import { Screen } from "../../shell/Screen";
import type { CountrySearch } from "./country-search";
import { ActBrief } from "./ActBrief";
import { ActCompare } from "./ActCompare";
import { Instruments, Objective } from "./ActChoices";
import { ManageDesk } from "./ActManage";
import { ActReceipt } from "./ActReceipt";
import { ActSummary } from "./ActSummary";
import { TargetPlate } from "./ActStages";
import { ActTermsForm } from "./ActTerms";
import { UnderWay } from "./ActUnderWay";
import { NoSuchNation } from "./NationScreen";
import { useActCommit, type ActDone } from "./use-act-commit";
import "../../nation/state/state.css";
import "./nation.css";
import "./act-workspace.css";

export type ActDeskProps = {
  readonly campaign: Campaign;
  readonly id: NationId;
  readonly config: ActConfig;
  /** Replaces the address's settings: choosing a goal or an act starts its terms over. */
  readonly onConfig: (next: ActConfig) => void;
  /** Validated, same-government dossier context; never execution terms. */
  readonly origin?: CountrySearch;
};

/** The act workspace for one government: objective, instrument, terms, then the assessment, then authorize and the receipt. */
export function ActDesk({ campaign, id, config, onConfig, origin }: ActDeskProps) {
  const [comparing, setComparing] = useState(false);
  const planHeading = useRef<HTMLHeadingElement>(null);
  const focusPlan = useRef(false);
  const [done, setDone] = useState<ActDone | undefined>();
  const act = useActCommit(campaign, id, setDone);
  const key = JSON.stringify(config);
  // The workspace prices every act on the board once per setting; it re-reads only when the board or the settings change.
  const view = useMemo(() => actWorkspace(campaign, id, config), [campaign, id, key]);
  const tariff = view?.chosen?.option.ref.kind === "tariff";
  const goods = useMemo(() => (tariff ? (bilateralTradePartners(campaign, id)?.sectors ?? []) : []), [campaign, id, tariff]);
  useEffect(() => {
    if (focusPlan.current && view?.chosen) {
      planHeading.current?.focus({ preventScroll: true });
      focusPlan.current = false;
    }
  }, [view?.chosen?.option.id]);
  if (!view) return <NoSuchNation />;
  if (done) return <ActReceipt nation={id} name={view.name} done={done} {...(origin ? { origin } : {})} />;
  if (config.manage) return <ManageDesk campaign={campaign} nation={id} name={view.name} id={config.manage} underway={view.underway} act={act} />;
  const chosen = view.chosen;
  const assessment = view.assessment;
  const department = chosen?.option.family === "military" ? institutionArtwork("INST-DOD") : undefined;
  const choose = (option: string) => {
    focusPlan.current = !comparing && window.matchMedia("(max-width: 74.99em)").matches;
    onConfig({ goal: view.goal ?? chosen?.option.goal ?? "ties", option });
  };
  return (
    <Screen icon="dispatch" title={`Act on ${view.name}`} eyebrow="Foreign policy · presidential action" screenClass="workspace" measure="data" camera={`nation:${id}`} selection={`nation:${id}`} lens="relations">
      <div className="act-desk">
        <TargetPlate campaign={campaign} nation={id} name={view.name} />
        <UnderWay nation={id} rows={view.underway} />
        <Objective view={view} onGoal={(goal) => onConfig({ goal })} />
        <div className="act-workspace" data-selected={chosen ? "true" : undefined}>
          <aside className="act-options-inline" aria-label="Available actions"><Instruments view={view} onOption={choose} /></aside>
          <div className="act-plan">
        {chosen ? <header className="act-plan__header">
          {department ? <img src={department.src} alt={department.name} className="act-plan__seal" width={44} height={44} /> : null}
          <div><span className="act-plan__eyebrow">Selected action</span><h2 ref={planHeading} tabIndex={-1}>{chosen.option.name}</h2></div>
          <Tag tone="neutral">Draft</Tag><div className="act-plan__change"><Button icon={<Icon name="review" size={16} />} onClick={() => setComparing(true)}>Compare actions</Button></div>
        </header> : null}
        {chosen && assessment ? <ActBrief chosen={chosen} assessment={assessment} /> : null}
        {chosen ? (
          <section className="act-step" id="act-stage-terms" aria-labelledby="act-step-terms">
            <h3 id="act-step-terms" className="act-section-title">Configure the action</h3>
            <ActTermsForm name={view.name} goods={goods} terms={view.terms} config={config} onConfig={(update) => onConfig({ ...config, ...update })} />
          </section>
        ) : null}
        {chosen && assessment ? (
          <section className="act-step" id="act-stage-authorize" aria-labelledby="act-step-assess">
            <h3 id="act-step-assess" className="act-section-title">Review and authorize</h3>
            <ActSummary nation={id} name={view.name} chosen={chosen} terms={view.terms} assessment={assessment} />
            <ActCompare key={chosen.option.id} assessment={assessment} projectAs={{ campaign, act: { act: "instrument", nation: id, option: chosen.option, config } }} busy={act.busy} onAuthorize={() => void act.take(() => buildAct(campaign, id, chosen.option, config), { tier: "full", title: assessment.title, lines: [{ label: "What it does", value: assessment.review }], verb: assessment.verb, danger: assessment.tone === "danger" })} />
          </section>
        ) : (
          <p className="act-waiting">
            <Icon name="review" size={18} /> Choose an act to see what it would do before you authorize it.
          </p>
        )}
          </div>
        </div>
        <Sheet open={comparing} onClose={() => setComparing(false)} title={`Actions toward ${view.name}`} placement="side" foot={<Button kind="primary" onClick={() => setComparing(false)}>Return to plan</Button>}>
          <Instruments view={view} onOption={choose} />
        </Sheet>
        {act.problem ? (
          <p className="decision__problem" role="alert">
            {act.problem}
          </p>
        ) : null}
      </div>
    </Screen>
  );
}
