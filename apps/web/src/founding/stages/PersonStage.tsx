import type { LeaderPronouns } from "@admin/engine";
import { leaderBackgroundById, stateById, PortraitHeritage, type PortraitGenderPresentation, type StateId } from "@admin/world";
import { Button, Choice, Field, Flag, Input, NativeSelect, Portrait } from "@admin/ui-web";
import { stateFlagUrl } from "../../media/flags";
import { withLeader, withoutLeaderField, type FoundingDraft } from "../draft";
import { drawnFace, faceHeritage, faceRef } from "../faces";
import { suggestName } from "../names";
import { Commits } from "../parts";
import { QuickPolitics, SchoolField } from "../ProfileFields";
import { HomeMap } from "../HomeMap";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const PRESENTATIONS = [
  { value: "feminine", label: "Feminine" },
  { value: "masculine", label: "Masculine" },
  { value: "androgynous", label: "Androgynous" },
] as const satisfies readonly { readonly value: PortraitGenderPresentation; readonly label: string }[];

const PRONOUNS: readonly LeaderPronouns[] = ["she/her", "he/him", "they/them"];
const NOT_STATED = "not-stated" as const;

/** How the record will speak of the President under each choice, so the choice is seen in use rather than as a code. */
const PRONOUN_SAMPLE: Readonly<Record<LeaderPronouns | typeof NOT_STATED, (name: string) => string>> = {
  "she/her": (name) => `${name} takes the oath. She signs her first order.`,
  "he/him": (name) => `${name} takes the oath. He signs his first order.`,
  "they/them": (name) => `${name} takes the oath. They sign their first order.`,
  [NOT_STATED]: (name) => `${name} takes the oath. The President signs the first order.`,
};


function NameField({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const suggest = () => update((current) => withLeader(current, { name: suggestName(current.leader.presentation, faceHeritage(current.leader.portraitRef)) }));
  return (
    <Field label="Name on the oath" hint="As history will record it.">
      {(props) => (
        <div className="field-row">
          <Input {...props} value={draft.leader.name} placeholder="Your full name" autoComplete="off" onChange={(event) => update((current) => withLeader(current, { name: event.target.value }))} />
          <Button kind="ghost" onClick={suggest}>
            Suggest a name
          </Button>
        </div>
      )}
    </Field>
  );
}

function AgeField({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const career = leaderBackgroundById.get(draft.leader.backgroundId as string);
  const min = career?.ageRange.min ?? 35;
  const max = career?.ageRange.max ?? 80;
  return <Field label={`Age: ${draft.leader.age}`} hint={`Age at the oath. ${career ? `${career.name}: ` : ""}${min} to ${max}.`}>
    {(props) => <input {...props} className="ui-input ui-input--range" type="range" min={min} max={max} value={draft.leader.age} onChange={(event) => update((current) => withLeader(current, { age: Number(event.target.value) }))} />}
  </Field>;
}

function PresentationField({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  return <Choice legend="Presents as" layout="cards" value={draft.leader.presentation} options={PRESENTATIONS} onChange={(presentation) => update((current) => withLeader(current, { presentation }))} />;
}

const HERITAGE_LABELS: Readonly<Record<PortraitHeritage, string>> = {
  "africa-west": "West African", "africa-east": "East African", "africa-southern": "Southern African", "africa-central": "Central African",
  mena: "Middle Eastern and North African", "europe-north": "Northern European", "europe-south": "Southern European", "europe-east": "Eastern European",
  "central-asia": "Central Asian", "south-asia": "South Asian", "east-asia": "East Asian", "southeast-asia": "Southeast Asian", "latin-america": "Latin American", pacific: "Pacific Islander", mixed: "Mixed heritage",
};

/** Keep the existing encoded profile contract without rendering or editing facial features. */
function HeritageField({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const heritage = faceHeritage(draft.leader.portraitRef);
  return <Field label="Heritage" hint="Your profile background; portrait imagery is redacted.">
    {(control) => <NativeSelect {...control} value={heritage ?? ""} onChange={(event) => {
      const selected = PortraitHeritage.safeParse(event.target.value);
      if (selected.success) update((current) => withLeader(current, { portraitRef: faceRef(drawnFace(current.leader.presentation ?? "androgynous", current.leader.age, current.leader.name || "president", selected.data)) }));
    }}>
      {heritage === undefined ? <option value="">Not recorded</option> : null}
      {PortraitHeritage.options.map((value) => <option key={value} value={value}>{HERITAGE_LABELS[value]}</option>)}
    </NativeSelect>}
  </Field>;
}

const STATES_BY_NAME = [...stateById.values()].sort((a, b) => a.name.localeCompare(b.name));

function HomeState({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const home = draft.leader.homeState;
  return (
    <div className="home-state">
      <Field label="Home state" hint="A running mate is balanced against it, and the map lights it.">
        {(props) => (
          <NativeSelect {...props} value={home ?? ""} onChange={(event) => update((current) => (event.target.value ? withLeader(current, { homeState: event.target.value as StateId }) : withoutLeaderField(current, "homeState")))}>
            <option value="">Not stated</option>
            {STATES_BY_NAME.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
          </NativeSelect>
        )}
      </Field>
      <HomeMap title="Where you are from" you={home} note="Your home state, lifted. Choose it here or on the map; a running mate from another region balances the ticket." onChoose={(state) => stateById.has(state as StateId) && update((current) => withLeader(current, { homeState: state as StateId }))} />
      <div className="home-state__chosen" aria-live="polite">
        {home ? (
          <>
            <Flag name={stateById.get(home)?.name ?? home} src={stateFlagUrl(home)} height={28} decorative />
            <span className="home-state__name">{stateById.get(home)?.name ?? home}</span>
            <Button size="sm" kind="ghost" onClick={() => update((current) => withoutLeaderField(current, "homeState"))}>
              Leave it unstated
            </Button>
          </>
        ) : (
          <span className="stage-note">No home state stated.</span>
        )}
      </div>
    </div>
  );
}

/** Identity remains editable; an unavailable portrait is never fabricated from demographic choices. */
export function PersonStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const pronouns = draft.leader.pronouns ?? NOT_STATED;
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <Commits>Your name is the one sworn in and written on every record of the term. Your identity and background carry into your administration.</Commits>
        <NameField draft={draft} update={update} />
        <AgeField draft={draft} update={update} />
        <PresentationField draft={draft} update={update} />
        <HeritageField draft={draft} update={update} />
        <Choice
          legend="Pronouns (optional)"
          hint="How the record and the press speak of you."
          layout="cards"
          className="pronoun-cards"
          value={pronouns}
          options={[...PRONOUNS, NOT_STATED].map((value: LeaderPronouns | typeof NOT_STATED) => ({ value, label: value === NOT_STATED ? "Not stated" : value, detail: PRONOUN_SAMPLE[value](draft.leader.name.trim() || "The President") }))}
          onChange={(value) => update((current) => (value === NOT_STATED ? withoutLeaderField(current, "pronouns") : withLeader(current, { pronouns: value as LeaderPronouns })))}
        />
        <HomeState draft={draft} update={update} />
        <SchoolField draft={draft} update={update} />
        {draft.setupMode === "short" ? <QuickPolitics draft={draft} update={update} /> : null}
      </div>
      <div className="stage-grid__side">
        <section className="setup-profile" aria-label="Presidential profile">
          <Portrait name={draft.leader.name || "The President"} size="xl" redacted />
          <h3>{draft.leader.name || "The President"}</h3>
          <p className="stage-note">Portrait redacted. Your profile details identify the administration.</p>
        </section>
      </div>
    </div>
  );
}
