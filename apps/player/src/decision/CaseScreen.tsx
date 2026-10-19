import type { Campaign, CaseDefault } from "@admin/engine";
import { CASE_TRAY_DISPOSITIONS, caseDetail, commitCaseDisposition, formatDate, place, type CaseDetailViewModel, type FamilyEntry } from "@admin/player-core";
import { Badge, Button, Column, EntityLink, Page, Row, Section, Text } from "@admin/ui";
import { BackButton } from "../shell/BackButton";
import { useAuthorize } from "../review/use-authorize";
import { FactGrid } from "@admin/ui/record";
import { Deadline, History, OpenEnded, Problem, go } from "./parts";
import { ResultPage } from "./ResultPage";

const LAPSE_WORDS: Readonly<Record<CaseDefault["kind"], string>> = {
  none: "Nothing happens on its own. It waits for you.",
  declined: "It goes on the record as a no.",
  "legal-default": "The law decides it. Whatever the law says should happen will happen without you.",
  failed: "It falls through, and the chance is gone.",
  delegated: "It goes to the office that handles it when you don't.",
  escalated: "It comes back later as a bigger problem.",
};

const STANCE_BADGE = { adverse: "danger", caution: "warning" } as const;

export type CaseDone = { readonly title: string; readonly date: string; readonly eventId?: string; readonly saveError?: string };

function Tray({ campaign, detail, onDone }: { readonly campaign: Campaign; readonly detail: CaseDetailViewModel; readonly onDone: (done: CaseDone) => void }) {
  const { busy, problem, authorize } = useAuthorize(campaign);
  const offered = CASE_TRAY_DISPOSITIONS.flatMap((kind) => detail.options.filter((option) => option.kind === kind));
  async function take(option: CaseDetailViewModel["options"][number]) {
    const title = `${option.label}: ${detail.title}`;
    const authorized = await authorize(() => {
      const answer = commitCaseDisposition(campaign, detail.id, option.kind);
      if (!answer.ok) throw new Error(answer.reason);
      return { packet: answer.packet };
    }, { tier: "confirm", title, verb: option.label, danger: option.kind !== "defer" }, { camera: "us" });
    if (!authorized) return;
    onDone({ title, date: authorized.date, ...(authorized.eventId ? { eventId: authorized.eventId } : {}), ...(authorized.saveError ? { saveError: authorized.saveError } : {}) });
  }
  if (offered.length === 0) return <Text variant="body" tone="secondary">This has been answered. There's nothing more for you to do here.</Text>;
  return (
    <Column gap="sm">
      <Row gap="sm" wrap>
        {offered.map((option) => (
          <Button key={option.kind} kind={option.kind === "defer" ? "secondary" : "danger"} size="compact" disabled={busy} onPress={() => void take(option)}>
            {option.label}
          </Button>
        ))}
      </Row>
      <Problem words={problem} />
    </Column>
  );
}

/** The answer taken on a case: the one result view, with its Record door and the next waiting matter. */
export function CaseReceipt({ campaign, done, here }: { readonly campaign: Campaign; readonly done: CaseDone; readonly here: string }) {
  return <ResultPage campaign={campaign} icon="approve" eyebrow="Answered" subject={done.title} title={done.title} date={done.date} saveError={done.saveError} eventId={done.eventId} here={here} />;
}

function timeLeft(detail: CaseDetailViewModel) {
  const clock = detail.clock;
  if (clock?.windowDays !== undefined && clock.daysRemaining !== undefined) return <Deadline clock={{ label: clock.dueLabel, window: clock.windowDays, left: clock.daysRemaining, unit: "day", ...(detail.dueDate ? { due: detail.dueDate } : {}) }} />;
  return <OpenEnded holds={false} note={`There's no deadline. It has waited ${detail.ageDays} ${detail.ageDays === 1 ? "day" : "days"}`} />;
}

/** A case on the President's desk as an obligation dossier: status, due date, consequence, required act, responsible office and history. */
export function CaseScreen({ campaign, entry, onDone }: { readonly campaign: Campaign; readonly entry: FamilyEntry; readonly onDone: (done: CaseDone) => void }) {
  const detail = caseDetail(campaign, entry);
  const hasClock = detail.clock?.windowDays !== undefined && detail.clock.daysRemaining !== undefined;
  return (
    <Page icon="pending" eyebrow={`Something you owe · ${detail.kindLabel} · ${detail.subject}`} title={detail.title}>
      <Row><BackButton parent={place.brief()} parentLabel="Brief" /></Row>
      <Section icon="pending" title="What you owe" actions={<Badge status={detail.stance === "adverse" || detail.stance === "caution" ? STANCE_BADGE[detail.stance] : "outline"}>{detail.statusLabel}</Badge>}>
        <Text variant="body">{detail.reason}</Text>
        <FactGrid
          items={[
            ...(!hasClock && detail.dueDate ? [{ label: "Due date", value: formatDate(detail.dueDate) }] : []),
            { label: "Time remaining", value: timeLeft(detail) },
            { label: "Who handles it", value: detail.delegable ? "You, or an office you hand it to" : "You" },
            { label: "What you need to do", value: detail.doorLabel ?? "Give an answer" },
            ...(detail.heldUntil ? [{ label: "Put off until", value: formatDate(detail.heldUntil) }] : []),
          ]}
        />
      </Section>
      <Section icon="caution" title="If you don't answer">
        <Text variant="body">{LAPSE_WORDS[entry.record.defaultOutcome.kind]}</Text>
      </Section>
      {detail.context ? (
        <Section icon="dossier" title="What it's about">
          <Column gap="xs" alignItems="flex-start">
            <EntityLink label={detail.context.title} href={detail.context!.href} onPress={() => go(detail.context!.href)} />
            <Text variant="body">{detail.context.line}</Text>
          </Column>
        </Section>
      ) : null}
      {detail.options.length > 0 || detail.href ? (
        <Section icon="sign" title="Your answer">
          {detail.href ? (
            <Row>
              <Button kind="primary" icon="open" onPress={() => go(detail.href!)}>
                {detail.doorLabel ?? "Open it"}
              </Button>
            </Row>
          ) : null}
          <Text variant="caption" tone="secondary">Or you can answer without taking action:</Text>
          <Tray campaign={campaign} detail={detail} onDone={onDone} />
        </Section>
      ) : null}
      <History empty="Nothing has happened to it yet." events={entry.record.history.map((step, index) => ({ key: `${index}`, when: formatDate(step.at), text: step.narration }))} />
    </Page>
  );
}
