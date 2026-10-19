import { GOVERNING_STYLES, type GoverningStyle, type LeaderDraft } from "@admin/engine";
import { GOVERNING_STYLE_WORDS, ticketLabel } from "@admin/player-core";
import { almaMatersFor, leaderBackgrounds, type SchoolId, type SchoolTier } from "@admin/world";
import { Column, Row, Surface, Text, Icon, type IconName } from "@admin/ui";
import { ChoiceList, Field, Select } from "@admin/ui/forms";
import { withLeader, type FoundingDraft } from "./draft";
import { CAREER_GLYPH, CardGlyph, PartyMark, STYLE_GLYPH } from "./glyphs";

type Props = { readonly draft: FoundingDraft; readonly update: (change: (draft: FoundingDraft) => FoundingDraft) => void };

const FROM_CAREER = "from-career";

/** The approach the President governs by, as cards with their marks; on the short path it is chosen, not read from answers. */
export function StyleField({ draft, update }: Props) {
  return (
    <ChoiceList
      label="Governing style"
      value={draft.leader.governingStyle ?? FROM_CAREER}
      options={[
        { value: FROM_CAREER, label: "From my career", detail: "Lead the way your career and your path to the White House taught you.", visual: <CardGlyph name={CAREER_GLYPH[draft.leader.backgroundId as string]} /> },
        ...GOVERNING_STYLES.map((style) => ({ value: style as string, label: GOVERNING_STYLE_WORDS[style].label, detail: GOVERNING_STYLE_WORDS[style].detail, visual: <CardGlyph name={STYLE_GLYPH[style]} /> })),
      ]}
      onChange={(value) =>
        update((current) => {
          if (value !== FROM_CAREER) return withLeader(current, { governingStyle: value as GoverningStyle });
          const { governingStyle: _style, ...leader } = current.leader;
          return { ...current, leader };
        })
      }
    />
  );
}

/** A name as a list files it: "The Citadel" under C, the way a reader looks for it. */
const sortName = (name: string): string => name.replace(/^The /, "");

const TIER_ORDER: readonly SchoolTier[] = ["global-elite", "national-flagship", "regional", "service-academy"];

const TIER_WORDS: Readonly<Record<SchoolTier, { readonly label: string; readonly glyph: IconName }>> = {
  "global-elite": { label: "Famous around the world", glyph: "world" },
  "national-flagship": { label: "Well known across the country", glyph: "flag" },
  regional: { label: "Known in their region", glyph: "mapPin" },
  "service-academy": { label: "Military and service academies", glyph: "shield" },
};

const SCHOOLS = [...almaMatersFor("USA")].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || sortName(a.name).localeCompare(sortName(b.name)));

/** Where the President studied: every school with its reach, filtered by typing in the list. */
export function SchoolField({ draft, update }: Props) {
  const choose = (value: string) =>
    update((current) => {
      if (value !== FROM_CAREER) return withLeader(current, { schoolId: value as SchoolId });
      const { schoolId: _school, ...leader } = current.leader;
      return { ...current, leader };
    });
  return (
    <Field label="College" help="Where you went to college is part of your life story, and it shapes who you know from school. It doesn't raise your Competence or Integrity scores.">
      {(control) => (
        <Select
          {...control}
          label="College"
          value={draft.leader.schoolId ?? FROM_CAREER}
          options={[
            { value: FROM_CAREER, label: "The college that fits my career", icon: CAREER_GLYPH[draft.leader.backgroundId as string] ?? "dossier" },
            ...SCHOOLS.map((school) => ({ value: school.id as string, label: school.name, detail: TIER_WORDS[school.tier].label, icon: TIER_WORDS[school.tier].glyph })),
          ]}
          onChange={choose}
        />
      )}
    </Field>
  );
}

const PARTIES: readonly LeaderDraft["party"][] = ["democrat", "republican", "independent"];

/** A compact biography edit uses the same draft and career constraints as the detailed record. */
export function QuickPolitics({ draft, update }: Props) {
  return (
    <Surface level="sunken" pad="lg" role="region" aria-label="Your party and background">
      <Column gap="lg">
        <Row gap="sm">
          <Icon name="subjectCapitol" size={22} tone="gold" />
          <Text variant="title" role="heading" aria-level={3}>
            Your party and background
          </Text>
        </Row>
        <ChoiceList
          label="Party"
          minCardWidth={180}
          value={draft.leader.party}
          options={PARTIES.map((party) => ({ value: party, label: ticketLabel(party, undefined), visual: <PartyMark party={party} /> }))}
          onChange={(party) => update((current) => withLeader(current, { party }))}
        />
        <ChoiceList
          label="Career"
          help="Your career sets your starting scores and the ages you can be."
          minCardWidth={220}
          value={draft.leader.backgroundId as string}
          options={leaderBackgrounds.map((background) => ({ value: background.id as string, label: background.name, detail: `Ages ${background.ageRange.min}–${background.ageRange.max}`, visual: <CardGlyph name={CAREER_GLYPH[background.id as string]} /> }))}
          onChange={(id) => update((current) => withLeader(current, { backgroundId: id as LeaderDraft["backgroundId"] }))}
        />
        <StyleField draft={draft} update={update} />
        <Text variant="caption" tone="secondary">
          Your beliefs start in the middle, neither left nor right. If you'd like to set your beliefs, your promises, and your White House staff yourself, choose “Customize every step.”
        </Text>
      </Column>
    </Surface>
  );
}
