import type { LeaderPronouns } from "@admin/engine";
import { PortraitHeritage, leaderBackgroundById, stateById, type PortraitGenderPresentation, type StateId } from "@admin/world";
import { Button, Column, Row, Text } from "@admin/ui";
import { ChoiceList, Field, Segmented, Select, Slider, TextInput } from "@admin/ui/forms";
import { withLeader, withoutLeaderField, type FoundingDraft } from "../draft";
import { drawnFace, faceHeritage, faceRef } from "../faces";
import { suggestName } from "../names";
import { Commits, TitledReading, RedactedPortrait, StageGrid } from "../parts";
import { QuickPolitics, SchoolField } from "../ProfileFields";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;
type Props = { readonly draft: FoundingDraft; readonly update: Update };

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

const HERITAGE_LABELS: Readonly<Record<PortraitHeritage, string>> = {
  "africa-west": "West African", "africa-east": "East African", "africa-southern": "Southern African", "africa-central": "Central African",
  mena: "Middle Eastern and North African", "europe-north": "Northern European", "europe-south": "Southern European", "europe-east": "Eastern European",
  "central-asia": "Central Asian", "south-asia": "South Asian", "east-asia": "East Asian", "southeast-asia": "Southeast Asian", "latin-america": "Latin American", pacific: "Pacific Islander", mixed: "Mixed heritage",
};

const STATES_BY_NAME = [...stateById.values()].sort((a, b) => a.name.localeCompare(b.name));

function NameField({ draft, update }: Props) {
  const suggest = () => update((current) => withLeader(current, { name: suggestName(current.leader.presentation, faceHeritage(current.leader.portraitRef)) }));
  return (
    <Field label="Name on the oath" help="The name everyone will know you by." required>
      {(control) => (
        <Row gap="sm" wrap>
          <Column flexGrow={1} flexBasis={220}>
            <TextInput {...control} kind="name" value={draft.leader.name} placeholder="Your full name" onChangeText={(name) => update((current) => withLeader(current, { name }))} testID="founding-name" />
          </Column>
          <Button kind="secondary" icon="review" onPress={suggest}>
            Suggest a name
          </Button>
        </Row>
      )}
    </Field>
  );
}

function AgeField({ draft, update }: Props) {
  const career = leaderBackgroundById.get(draft.leader.backgroundId as string);
  const min = career?.ageRange.min ?? 35;
  const max = career?.ageRange.max ?? 80;
  return (
    <Field label="Age at the oath" help={`${career ? "For your career, you" : "You"} can be ${min} to ${max}.`} aside={<Text variant="title" tabular>{draft.leader.age}</Text>}>
      {(control) => <Slider {...control} min={min} max={max} value={draft.leader.age} valueText={`${draft.leader.age} years old`} onChange={(age) => update((current) => withLeader(current, { age }))} />}
    </Field>
  );
}

/** Keeps the encoded profile contract without rendering or editing facial features. */
function HeritageField({ draft, update }: Props) {
  const heritage = faceHeritage(draft.leader.portraitRef);
  return (
    <Field label="Heritage" help="Where your family comes from. It's part of your life story. Portraits aren't shown.">
      {(control) => (
        <Select
          {...control}
          label="Heritage"
          placeholder="Not recorded"
          value={heritage}
          options={PortraitHeritage.options.map((value) => ({ value, label: HERITAGE_LABELS[value] }))}
          onChange={(selected) => update((current) => withLeader(current, { portraitRef: faceRef(drawnFace(current.leader.presentation ?? "androgynous", current.leader.age, current.leader.name || "president", selected)) }))}
        />
      )}
    </Field>
  );
}

function HomeState({ draft, update }: Props) {
  const home = draft.leader.homeState;
  return (
    <Field label="Home state" help="The map marks your home state, and the running mates we suggest are picked to balance it.">
      {(control) => (
        <Select
          {...control}
          label="Home state"
          value={home ?? NOT_STATED}
          options={[{ value: NOT_STATED, label: "Not stated" }, ...STATES_BY_NAME.map((state) => ({ value: state.id as string, label: state.name }))]}
          onChange={(value) => update((current) => (value === NOT_STATED ? withoutLeaderField(current, "homeState") : withLeader(current, { homeState: value as StateId })))}
        />
      )}
    </Field>
  );
}

function Pronouns({ draft, update }: Props) {
  return (
    <ChoiceList
      label="Pronouns (optional)"
      help="How your Record and news stories talk about you."
      minCardWidth={220}
      value={draft.leader.pronouns ?? NOT_STATED}
      options={[...PRONOUNS, NOT_STATED].map((value: LeaderPronouns | typeof NOT_STATED) => ({ value, label: value === NOT_STATED ? "Not stated" : value, detail: PRONOUN_SAMPLE[value](draft.leader.name.trim() || "The President") }))}
      onChange={(value) => update((current) => (value === NOT_STATED ? withoutLeaderField(current, "pronouns") : withLeader(current, { pronouns: value as LeaderPronouns })))}
    />
  );
}

function Profile({ draft }: { readonly draft: FoundingDraft }) {
  const name = draft.leader.name.trim() || "The President";
  const home = draft.leader.homeState ? stateById.get(draft.leader.homeState)?.name : undefined;
  return (
    <TitledReading icon="dossier" title="Your profile">
      <Column gap="sm" alignItems="center">
        <RedactedPortrait name={name} party={draft.leader.party} size={112} />
        <Text variant="heading" serif center>
          {name}
        </Text>
        <Text variant="caption" tone="secondary" center>
          {[`Age ${draft.leader.age}`, home].filter(Boolean).join(" · ")}
        </Text>
        <Text variant="caption" tone="tertiary" center>
          There's no portrait. Your name and details stand in for one.
        </Text>
      </Column>
    </TitledReading>
  );
}

/** Identity remains editable; an unavailable portrait is never fabricated from demographic choices. */
export function PersonStage({ draft, update }: Props) {
  return (
    <StageGrid
      main={
        <>
          <Commits>You'll be sworn in under this name, and it will appear on every record of your time in office. Who you are and where you come from stay with you the whole way through.</Commits>
          <NameField draft={draft} update={update} />
          <AgeField draft={draft} update={update} />
          <Segmented label="Presents as" options={PRESENTATIONS} value={draft.leader.presentation} onChange={(presentation) => update((current) => withLeader(current, { presentation }))} />
          <HeritageField draft={draft} update={update} />
          <Pronouns draft={draft} update={update} />
          <HomeState draft={draft} update={update} />
          <SchoolField draft={draft} update={update} />
          {draft.setupMode === "short" ? <QuickPolitics draft={draft} update={update} /> : null}
        </>
      }
      side={<Profile draft={draft} />}
    />
  );
}
