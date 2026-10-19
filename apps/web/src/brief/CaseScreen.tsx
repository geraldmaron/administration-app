import type { Campaign, CaseDefault } from "@admin/engine";
import { CASE_TRAY_DISPOSITIONS, caseDetail, commitCaseDisposition, formatDate, type CaseDetailViewModel, type FamilyEntry } from "@admin/player-core";
import { Button, Card, CardContent, buttonClass, Countdown, Icon, OpenEnded, Receipt, Tag } from "@admin/ui-web";
import { useAuthorize } from "../app/use-authorize";
import { useBuilt } from "../shell/built-routes";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";
import { ObligationFacts, ObligationHistory } from "./Obligation";

const LAPSE_WORDS: Readonly<Record<CaseDefault["kind"], string>> = {
  none: "Nothing happens on its own; it waits until you answer.",
  declined: "It is recorded as declined: the answer is no.",
  "legal-default": "The law decides it: what the statute says happens without you, happens.",
  failed: "It fails: the chance is gone.",
  delegated: "It passes to the office that would act in your place.",
  escalated: "It comes back larger, as a new matter.",
};

export type CaseDone = { readonly title: string; readonly date: string; readonly eventId?: string; readonly saveError?: string };

function Tray({ campaign, detail, onDone }: { readonly campaign: Campaign; readonly detail: CaseDetailViewModel; readonly onDone: (done: CaseDone) => void }) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const offered = CASE_TRAY_DISPOSITIONS.flatMap((kind) => detail.options.filter((option) => option.kind === kind));
  async function take(option: CaseDetailViewModel["options"][number]) {
    const authorized = await authorize(() => {
      const answer = commitCaseDisposition(campaign, detail.id, option.kind);
      if (!answer.ok) throw new Error(answer.reason);
      return { packet: answer.packet };
    }, { tier: "confirm", title: `${option.label}: ${detail.title}`, danger: option.kind !== "defer" }, { camera: "us" });
    if (!authorized) return;
    onDone({ title: `${option.label}: ${detail.title}`, date: authorized.date, ...(authorized.eventId ? { eventId: authorized.eventId } : {}), ...(authorized.saveError ? { saveError: authorized.saveError } : {}) });
  }
  if (offered.length === 0) return <p className="moves__none">It has been answered; nothing more is asked of you here.</p>;
  return (
    <div className="tray">
      {offered.map((option) => (
        <Button key={option.kind} kind={option.kind === "defer" ? "secondary" : "danger"} size="sm" busy={busy} onClick={() => void take(option)}>
          {option.label}
        </Button>
      ))}
      {problem ? <p role="alert">{problem}</p> : null}
    </div>
  );
}

/** The answer taken on a case, with the door to its Record entry; the map plays what it moved. */
export function CaseReceipt({ done }: { readonly done: CaseDone }) {
  return (
    <Screen icon="approve" title={done.title} eyebrow="Answered" screenClass="workspace" camera="us">
      <Receipt title={done.title} date={done.date} lines={[]} record={done.saveError ? `It stands, but this device did not save it: ${done.saveError}` : "It is on your Record."}>
        {done.eventId ? (
          <Door href={`/record/event/${encodeURIComponent(done.eventId)}`} className={buttonClass("primary", "sm")}>
            Open the Record entry
          </Door>
        ) : null}
        <Door href="/brief" className={buttonClass("ghost", "sm")}>
          Back to the Brief
        </Door>
      </Receipt>
    </Screen>
  );
}

/** A case on the President's desk as an obligation dossier: status, due date, consequence, required act, responsible office and history. */
export function CaseScreen({ campaign, entry, onDone }: { readonly campaign: Campaign; readonly entry: FamilyEntry; readonly onDone: (done: CaseDone) => void }) {
  const built = useBuilt();
  const detail = caseDetail(campaign, entry);
  const clock = detail.clock?.windowDays !== undefined && detail.clock.daysRemaining !== undefined ? { label: detail.clock.dueLabel, window: detail.clock.windowDays, left: detail.clock.daysRemaining, unit: "day" as const, ...(detail.dueDate ? { due: detail.dueDate } : {}) } : undefined;
  const open = built(detail.href);
  const answerable = detail.options.length > 0 || open;
  return (
    <Screen icon="pending" title={detail.title} eyebrow={`Obligation · ${detail.kindLabel} · ${detail.subject}`} screenClass="workspace" camera="us">
      <div className="case">
        <Card role="region" aria-labelledby="case-status"><CardContent className="grid gap-3 pt-5">
          <h2 id="case-status" className="brief-section__title">
            <Tag tone={detail.stance === "adverse" ? "risk" : detail.stance === "caution" ? "caution" : "neutral"}>{detail.statusLabel}</Tag> What is owed
          </h2>
          <p className="case__reason">{detail.reason}</p>
          <ObligationFacts
            facts={[
              ...(!clock && detail.dueDate ? [{ label: "Due date", value: formatDate(detail.dueDate) }] : []),
              { label: "Time remaining", value: clock ? <Countdown left={clock.left} window={clock.window} unit={clock.unit} {...(clock.due ? { dueText: formatDate(clock.due) } : {})} /> : <OpenEnded holds={false} note={`No rule sets a deadline; waiting ${detail.ageDays} ${detail.ageDays === 1 ? "day" : "days"}`} /> },
              { label: "Responsible", value: detail.delegable ? "The President, or the office the President delegates it to" : "The President" },
              { label: "Required act", value: detail.doorLabel ?? "An answer from the President" },
              ...(detail.heldUntil ? [{ label: "Put off until", value: formatDate(detail.heldUntil) }] : []),
            ]}
          />
        </CardContent></Card>
        <Card role="region" aria-labelledby="case-lapse"><CardContent className="grid gap-3 pt-5">
          <h2 id="case-lapse" className="brief-section__title">
            <Icon name="caution" size={20} /> If it is not answered
          </h2>
          <p>{LAPSE_WORDS[entry.record.defaultOutcome.kind]}</p>
        </CardContent></Card>
        {detail.context ? (
          <Card role="region" aria-labelledby="case-context"><CardContent className="grid gap-3 pt-5">
            <h2 id="case-context" className="brief-section__title">
              <Icon name="dossier" size={20} /> What it is about
            </h2>
            <p>
              <strong>{detail.context.title}.</strong> {detail.context.line}
            </p>
          </CardContent></Card>
        ) : null}
        {answerable ? (
          <Card role="region" aria-labelledby="case-act"><CardContent className="grid gap-3 pt-5">
            <h2 id="case-act" className="brief-section__title">
              <Icon name="sign" size={20} /> Your answer
            </h2>
            {open ? (
              <Door href={detail.href!} className={buttonClass("primary")}>
                {detail.doorLabel ?? "Open it"}
              </Door>
            ) : (
              <p className="matter__later">{detail.doorLabel ?? "The act"} is taken on its own record, which does not open from here. You can still answer without acting:</p>
            )}
            <Tray campaign={campaign} detail={detail} onDone={onDone} />
          </CardContent></Card>
        ) : null}
        <ObligationHistory
          empty="Nothing has happened to it yet."
          events={entry.record.history.map((step, index) => ({ key: `${index}`, when: formatDate(step.at), text: step.narration }))}
        />
      </div>
    </Screen>
  );
}
