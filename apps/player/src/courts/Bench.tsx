import type { Campaign } from "@admin/engine";
import { agreementKey, place, type CourtSystem } from "@admin/player-core";
import { Card, Column, ReadingFrame, Row, Text, useMedia, View, type KeyEntry } from "@admin/ui";
import { BandSteps } from "@admin/ui/dossier";
import { BenchArc, benchKeyEntries } from "@admin/ui/legislature";
import { PersonName } from "../dossier/PersonPeek";
import { termDoor } from "../handbook/term-door";
import { useLawViews } from "../law/LawHelp";
import { LAW, initials } from "./model";
import { Note, RowLink, go } from "../congress/parts";

const SG_WORDS = { strained: "Strained", mixed: "Mixed", strong: "Strong" } as const;
const SG_LIT = { strained: 1, mixed: 2, strong: 3 } as const;
const SG_TONE = { strained: "bad", mixed: "watch", strong: "good" } as const;
const surname = (name: string): string => name.split(" ").at(-1) ?? name;

/** The arc and the roster name the same justices; a seat opens that justice's file, an open seat the nominations. */
export function CourtBench({ campaign, system }: { readonly campaign: Campaign; readonly system: CourtSystem }) {
  const ordered = [...system.justices].sort((a, b) => (a.lean ?? 0) - (b.lean ?? 0) || a.seat - b.seat);
  const hrefOf = (justice: CourtSystem["justices"][number]) => (justice.vacant ? `${place.courts()}?view=nominations` : justice.href);
  const seated = ordered.filter((justice) => !justice.vacant).length;
  const law = useLawViews([LAW.appointments]);
  return (
    <Card title="The Supreme Court" icon="court">
      <Row gap="lg" top wrap>
        <Column flexGrow={1} flexShrink={1} flexBasis={260} minWidth={0} gap="xs">
          <ReadingFrame
            title="How the justices have leaned on the economy"
            unit={`${seated} of ${ordered.length} seats filled, left to right by lean`}
            period="From their recorded votes"
            legend={benchKeyEntries({ chief: ordered.some((justice) => justice.chief), open: ordered.some((justice) => justice.vacant) })}
            pressHint="Press a seat to open that justice's file, or an empty seat to open the nominations."
            help={{ meaning: `The seats run left to right by how each justice has leaned on the economy in past votes. Blue and red here are lean, read from their recorded votes, never the party that appointed them, and it doesn't predict a ruling. It takes ${system.majority} votes to strike down an order, and at least six justices have to take part before the Court can decide a case. If the vote is tied, the lower court's ruling stands.`, law, term: termDoor("supreme-court", "the Supreme Court") }}
          >
            <BenchArc label={`${seated} of ${ordered.length} seats filled, ordered left to right by past lean`} figure={String(system.majority)} caption="votes to strike down an order" seats={ordered.map((justice) => ({ id: String(justice.seat), initials: justice.vacant ? "—" : initials(justice.name), vacant: justice.vacant, chief: justice.chief, ...(justice.lean !== undefined ? { lean: justice.lean } : {}) }))} onSeat={(id) => { const justice = ordered.find((entry) => String(entry.seat) === id); const href = justice ? hrefOf(justice) : undefined; if (href) go(href); }} />
            <Row between><Text variant="caption" tone="tertiary">Left</Text><Text variant="caption" tone="tertiary">Lean on the economy</Text><Text variant="caption" tone="tertiary">Right</Text></Row>
          </ReadingFrame>
        </Column>
        <Column flexGrow={1} flexShrink={1} flexBasis={260} minWidth={0} gap="2xs" role="list" aria-label="Justices, left to right">
          {ordered.map((justice) => {
            const href = hrefOf(justice);
            const role = justice.vacant ? (justice.pending ? `${justice.pending} is waiting on the Senate` : "No nominee yet · Pick someone") : `${justice.chief ? "Chief Justice" : "Associate Justice"} · ${justice.age === undefined ? "age not known" : `age ${justice.age}`} · ${justice.tenure === undefined ? "time on the Court not known" : `${justice.tenure} years on the Court`}`;
            const body = (
              <Column gap="2xs">
                {justice.vacant ? <Text variant="label">Open seat</Text> : <PersonName campaign={campaign} id={justice.personId} name={justice.name} role={justice.chief ? "Chief Justice" : "Associate Justice"} />}
                <Text variant="caption" tone="secondary">{role}</Text>
              </Column>
            );
            return (
              <View key={justice.seat} role="listitem">
                {href ? <RowLink label={justice.vacant ? "Open the nominations for the empty Supreme Court seat" : `Open ${justice.name}'s file`} href={href}>{body}</RowLink> : <View padding="sm">{body}</View>}
              </View>
            );
          })}
        </Column>
      </Row>
      <Column gap="xs">
        <BandSteps label="Your Solicitor General's standing with the Court" lit={SG_LIT[system.solicitorGeneral.assessment]} steps={3} word={SG_WORDS[system.solicitorGeneral.assessment]} tone={SG_TONE[system.solicitorGeneral.assessment]} />
        <Text variant="caption" tone="tertiary">Three steps: Strained, Mixed, Strong. It affects whether the Court takes or pauses a case, not how it rules.</Text>
      </Column>
    </Card>
  );
}

const AGREEMENT_KEY: readonly KeyEntry[] = [
  { id: "full", kind: "swatch", label: "Bar height: the share of shared cases the pair voted the same way, full when every case matched", ink: "accent" },
  { id: "empty", kind: "swatch", label: "Empty cell: no case voted on together yet", ink: "borderColor" },
];

/**
 * How often each pair of sitting justices voted the same way, counted only
 * over cases both voted in, with the sample in each cell. With no shared vote
 * anywhere the whole matrix is one empty state, never a grid of blanks.
 */
export function AgreementMatrix({ system }: { readonly system: CourtSystem }) {
  const media = useMedia();
  const seated = system.justices.filter((justice) => !justice.vacant && justice.personId);
  const most = Math.max(0, ...[...system.agreement.values()].map((cell) => cell.shared));
  const head = media.phone ? 44 : 84;
  return (
    <Card title="How the justices vote together" icon="graph">
      {!system.agreementRecorded ? (
        <Note>The justices haven't voted on a case together yet. This chart fills in after the Court's first ruling.</Note>
      ) : (
        <ReadingFrame
          title="How often each pair voted the same way"
          unit="Cases they voted on together (agreed of shared)"
          period="Since you took office"
          legend={AGREEMENT_KEY}
          help={{ meaning: "Each square stands for two justices. The number is how many cases they voted the same way, out of the cases they both voted in. The bar fills to the same share. A few cases don't tell you much, so read the number under the bar.", term: termDoor("judicial-review", "judicial review") }}
        >
          <Note>{most === 1 ? "No pair has voted together in more than one case, and one shared vote isn't a pattern yet." : `The most cases any two justices have voted on together is ${most}.`}</Note>
          <Column gap="2xs" role="table" aria-label="How often each pair of justices voted the same way">
            <Row gap="2xs" role="row">
              <View width={head} />
              {seated.slice(0, -1).map((justice) => <Text key={justice.seat} variant="caption" weight="strong" flex={1} minWidth={0} center numberOfLines={1} aria-label={justice.name}>{media.phone ? initials(justice.name) : surname(justice.name)}</Text>)}
            </Row>
            {seated.slice(1).map((row, below) => (
              <Row key={row.seat} gap="2xs" role="row">
                <Text variant="caption" weight="strong" width={head} numberOfLines={1} aria-label={row.name}>{media.phone ? initials(row.name) : surname(row.name)}</Text>
                {seated.slice(0, -1).map((column, columnIndex) => {
                  // Agreement is symmetric, so each pair is drawn once, below the diagonal.
                  if (columnIndex > below) return <View key={column.seat} flex={1} minWidth={0} />;
                  const cell = system.agreement.get(agreementKey(row.personId!, column.personId!));
                  const share = cell && cell.shared > 0 ? cell.together / cell.shared : undefined;
                  return (
                    <View key={column.seat} flex={1} minWidth={0} height={36} borderRadius="chip" backgroundColor="borderColor" overflow="hidden" justifyContent="flex-end" alignItems="center" aria-label={cell ? `${row.name} and ${column.name} voted the same way in ${cell.together} of ${cell.shared} cases` : "No cases together yet"}>
                      {share === undefined ? null : <View position="absolute" left={0} right={0} bottom={0} height={`${Math.round(share * 100)}%`} backgroundColor="accent" />}
                      <View position="absolute" top={0} bottom={0} left={0} right={0} alignItems="center" justifyContent="center">
                        <View backgroundColor="surface" paddingHorizontal="2xs" borderRadius="chip">
                          <Text variant="caption" weight="strong" tabular>{cell && cell.shared > 0 ? `${cell.together}/${cell.shared}` : "—"}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Row>
            ))}
          </Column>
        </ReadingFrame>
      )}
    </Card>
  );
}
