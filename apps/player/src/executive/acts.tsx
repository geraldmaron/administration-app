import { useRef, useState, type ReactNode } from "react";
import type { Campaign, EffectPacket } from "@admin/engine";
import { formatDate } from "@admin/player-core";
import { Tag, Button, Column, LegalCitation, Row, Sheet, Surface, Text } from "@admin/ui";
import { Toggle } from "@admin/ui/forms";
import { useCampaignStore } from "../device/hooks";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { refusalWords } from "../shell/advance";
import { actCitation, type ActLaw } from "./present";

/** The engine's answer to an act: its packet (or a run of packets that is one act), or the refusal in the engine's own words. */
export type ActBuild = { readonly ok: true; readonly packet: EffectPacket | readonly EffectPacket[] } | { readonly ok: false; readonly reason: string };

export type ActLine = { readonly label: string; readonly value: string };

/**
 * How the act is put to the President. `confirm` asks for the named
 * confirmation; `full` also asks the President to say they have read the
 * terms, for an act that removes somebody or cannot be taken back.
 */
export type ActReview = { readonly tier: "confirm" | "full"; readonly title: string; readonly verb?: string; readonly danger?: boolean; readonly law?: ActLaw };

/** What an act did, kept beside its receipt so it is said from the commit, not re-read off a board that has moved. */
export type ChairActDone = {
  readonly title: string;
  readonly date: string;
  readonly before: Campaign;
  readonly after: Campaign;
  readonly eventId?: string;
  readonly saveError?: string;
  readonly lines: readonly ActLine[];
};

type Pending = { readonly title: string; readonly packet: EffectPacket | readonly EffectPacket[]; readonly review: ActReview; readonly lines: readonly ActLine[] };

function ReviewBody({ pending, read, onRead }: { readonly pending: Pending; readonly read: boolean; readonly onRead: (value: boolean) => void }) {
  const openLaw = useOpenAuthority();
  const law = pending.review.law ? actCitation(pending.review.law) : undefined;
  return (
    <Column gap="md">
      <Tag tone={pending.review.danger ? "danger" : "info"} icon="review">
        {pending.review.tier === "full" ? "Full review" : "Confirmation"}
      </Tag>
      <Text variant="body">What you do and what it costs go on your Record.</Text>
      {pending.lines.length ? (
        <Surface level="raised" pad="md">
          <Column gap="xs">
            {pending.lines.map((line) => (
              <Row key={line.label} gap="sm" between>
                <Text variant="caption" tone="secondary">
                  {line.label}
                </Text>
                <Text variant="label">{line.value}</Text>
              </Row>
            ))}
          </Column>
        </Surface>
      ) : null}
      {law ? <LegalCitation citation={law} onPress={() => openLaw(law.cite)} /> : null}
      {pending.review.tier === "full" ? <Toggle label="I've read the details and the law behind this" value={read} onChange={onRead} /> : null}
    </Column>
  );
}

const isRun = (packet: EffectPacket | readonly EffectPacket[]): packet is readonly EffectPacket[] => Array.isArray(packet);

type Settled = { readonly before: Campaign; readonly after: Campaign; readonly eventId?: string; readonly saveError?: string };

/**
 * One commit path for every act on the executive's screens. The act is built
 * by its engine entry point against the campaign the screen showed, so an act
 * the engine refuses is said in its own words before any review opens. Only
 * the named confirmation commits it, against that same campaign as its
 * `basis`: terms that moved while the President read them are refused with
 * what moved.
 */
export function useChairActs(campaign: Campaign, onDone: (done: ChairActDone) => void) {
  const store = useCampaignStore();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [pending, setPending] = useState<Pending | undefined>(undefined);
  const [read, setRead] = useState(false);

  function run(title: string, build: () => ActBuild, review: ActReview, lines: readonly ActLine[] = []): void {
    setProblem("");
    const built = build();
    if (!built.ok) {
      setProblem(built.reason);
      return;
    }
    setRead(false);
    setPending({ title, packet: built.packet, review, lines });
  }

  async function commit(entry: Pending): Promise<Settled | undefined> {
    const receipt = isRun(entry.packet) ? await store.commitAll(entry.packet, undefined, { basis: campaign }) : await store.commit(entry.packet, { basis: campaign });
    const after = store.getState();
    if (after.status !== "ready") {
      setProblem("It went through, but the game couldn't show you the result. Open the Record to see it.");
      return undefined;
    }
    const eventId = receipt.eventIds.at(-1);
    return { before: campaign, after: after.campaign, ...(eventId ? { eventId } : {}), ...(receipt.persisted ? {} : { saveError: receipt.saveError ?? "The device didn't say why." }) };
  }

  async function confirm(): Promise<void> {
    if (!pending || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const entry = pending;
    setPending(undefined);
    try {
      const settled = await commit(entry);
      if (settled) onDone({ title: entry.title, date: formatDate(settled.after.calendar), lines: entry.lines, ...settled });
    } catch (cause: unknown) {
      setProblem(refusalWords(cause, campaign, store.getState()));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const sheet: ReactNode = (
    <Sheet
      open={pending !== undefined}
      onClose={() => setPending(undefined)}
      title={pending?.review.title ?? ""}
      eyebrow="Your final review"
      footer={
        <Row gap="sm" wrap>
          <Button kind="secondary" onPress={() => setPending(undefined)}>
            Not now
          </Button>
          <Button kind={pending?.review.danger ? "danger" : "primary"} icon="approve" disabled={pending?.review.tier === "full" && !read} onPress={() => void confirm()}>
            {pending?.review.verb ?? "Confirm"}
          </Button>
        </Row>
      }
    >
      {pending ? <ReviewBody pending={pending} read={read} onRead={setRead} /> : null}
    </Sheet>
  );

  return { busy, problem, run, sheet };
}

export type ChairActs = ReturnType<typeof useChairActs>;
