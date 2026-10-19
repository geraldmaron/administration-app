import { useId, useState } from "react";
import { GOVERNING_STYLES, type GoverningStyle, type LeaderDraft } from "@admin/engine";
import { GOVERNING_STYLE_WORDS, ticketLabel } from "@admin/player-core";
import { almaMatersFor, leaderBackgrounds, type SchoolId, type SchoolTier } from "@admin/world";
import { Choice, Icon, Input, type IconName } from "@admin/ui-web";
import { withLeader, type FoundingDraft } from "./draft";
import { CAREER_GLYPH, CardGlyph, PartyMark, STYLE_GLYPH } from "./glyphs";

type Props = { readonly draft: FoundingDraft; readonly update: (change: (draft: FoundingDraft) => FoundingDraft) => void };

const FROM_CAREER = "from-career";

/** The approach the President governs by, as cards with their marks; on the short path it is chosen, not read from answers. */
export function StyleField({ draft, update }: Props) {
  return (
    <Choice
      legend="Governing style"
      layout="cards"
      value={draft.leader.governingStyle ?? FROM_CAREER}
      options={[
        { value: FROM_CAREER, label: "From my career", detail: "Keep the dispositions your career and route to office formed.", visual: <CardGlyph name={CAREER_GLYPH[draft.leader.backgroundId as string]} /> },
        ...GOVERNING_STYLES.map((style) => ({ value: style, label: GOVERNING_STYLE_WORDS[style].label, detail: GOVERNING_STYLE_WORDS[style].detail, visual: <CardGlyph name={STYLE_GLYPH[style]} /> })),
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
  "global-elite": { label: "Known in every capital", glyph: "world" },
  "national-flagship": { label: "National flagships", glyph: "flag" },
  regional: { label: "Regional universities", glyph: "mapPin" },
  "service-academy": { label: "Service academies", glyph: "shield" },
};

const FROM_CAREER_SCHOOL = "";

/** Where the President studied: the schools in groups by reach, each group under its mark, narrowed by typing. */
export function SchoolField({ draft, update }: Props) {
  const [query, setQuery] = useState("");
  const name = useId();
  const chosen = draft.leader.schoolId ?? FROM_CAREER_SCHOOL;
  const needle = query.trim().toLowerCase();
  const schools = [...almaMatersFor("USA")].filter((school) => needle === "" || school.name.toLowerCase().includes(needle)).sort((a, b) => sortName(a.name).localeCompare(sortName(b.name)));
  const choose = (value: string) =>
    update((current) => {
      if (value !== FROM_CAREER_SCHOOL) return withLeader(current, { schoolId: value as SchoolId });
      const { schoolId: _school, ...leader } = current.leader;
      return { ...current, leader };
    });
  const option = (value: string, label: string, glyph: IconName) => (
    <label key={value || "career"} className="school-option" data-checked={chosen === value ? "true" : undefined}>
      <input type="radio" name={name} value={value} checked={chosen === value} onChange={() => choose(value)} />
      <Icon name={glyph} size={18} />
      <span>{label}</span>
    </label>
  );
  return (
    <fieldset className="school-field">
      <legend className="ui-field__label">
        <Icon name="departmentEducation" size={18} /> Alma mater
      </legend>
      <p className="ui-field__hint">Part of your biography and education network. It does not increase your competence or integrity.</p>
      <Input type="search" placeholder="Find a school" aria-label="Find a school" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="school-field__list">
        {needle === "" ? option(FROM_CAREER_SCHOOL, "The school my career suggests", CAREER_GLYPH[draft.leader.backgroundId as string] ?? "dossier") : null}
        {TIER_ORDER.map((tier) => {
          const group = schools.filter((school) => school.tier === tier);
          if (group.length === 0) return null;
          return (
            <div key={tier} className="school-field__group">
              <p className="school-field__tier">
                <Icon name={TIER_WORDS[tier].glyph} size={16} /> {TIER_WORDS[tier].label}
              </p>
              <div className="school-field__options">{group.map((school) => option(school.id as string, school.name, TIER_WORDS[tier].glyph))}</div>
            </div>
          );
        })}
        {schools.length === 0 ? <p className="stage-note">No school by that name.</p> : null}
      </div>
    </fieldset>
  );
}

const PARTIES: readonly LeaderDraft["party"][] = ["democrat", "republican", "independent"];

/** A compact biography edit uses the same draft and career constraints as the detailed record. */
export function QuickPolitics({ draft, update }: Props) {
  return (
    <section className="setup-profile" aria-label="Your administration">
      <h3>
        <Icon name="subjectCapitol" size={20} /> Your administration
      </h3>
      <Choice
        legend="Party"
        layout="cards"
        value={draft.leader.party}
        options={PARTIES.map((party) => ({ value: party, label: ticketLabel(party, undefined), visual: <PartyMark party={party} /> }))}
        onChange={(party) => update((current) => withLeader(current, { party }))}
      />
      <Choice
        legend="Career"
        hint="Your background sets your starting attributes and plausible age range."
        layout="cards"
        value={draft.leader.backgroundId as string}
        options={leaderBackgrounds.map((background) => ({ value: background.id as string, label: background.name, detail: `Ages ${background.ageRange.min}–${background.ageRange.max}`, visual: <CardGlyph name={CAREER_GLYPH[background.id as string]} /> }))}
        onChange={(id) => update((current) => withLeader(current, { backgroundId: id as LeaderDraft["backgroundId"] }))}
      />
      <StyleField draft={draft} update={update} />
      <p className="stage-note">Beliefs start at the center. Open “Customize every stage” to set your positions, platform and White House staff before taking the oath.</p>
    </section>
  );
}
