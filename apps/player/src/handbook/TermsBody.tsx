import { useMemo, useState } from "react";
import { GLOSSARY, authoritiesForGlossaryTerm } from "@admin/player-core";
import { Column, Icon, Pressable, Row, Text, isIconName } from "@admin/ui";
import { Field, Segmented, TextInput } from "@admin/ui/forms";
import { Anchor, GlossaryCard, useScrollToAnchor } from "@admin/ui/handbook";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { RouterLink } from "../shell/RouterLink";
import { filterTerms, glossaryCard, groupByLetter, termDoors } from "./selectors";

type Scope = "all" | "law";

function Letters({ letters }: { readonly letters: readonly string[] }) {
  const scrollTo = useScrollToAnchor();
  if (letters.length < 2) return null;
  return (
    <Row gap="2xs" wrap role="navigation" aria-label="Jump to a letter">
      {letters.map((letter) => (
        <Pressable href={`#letter-${letter}`} key={letter} onPress={() => scrollTo(`letter-${letter}`)} role="link" aria-label={`Terms under ${letter}`} width={34} height={34} alignItems="center" justifyContent="center" borderWidth={1} borderColor="borderColor" borderRadius="control">
          <Text variant="label" tone="accent">
            {letter}
          </Text>
        </Pressable>
      ))}
    </Row>
  );
}

/** Where the game uses a term: the screens of the chapters that teach it, and those chapters, as doors. */
function WhereUsed({ id, term }: { readonly id: string; readonly term: string }) {
  const { chapters, screens } = termDoors(id);
  const doors = [...screens.map((door) => ({ ...door, label: `Open ${door.title}`, text: door.title })), ...chapters.map((door) => ({ ...door, label: `Read the chapter: ${door.title}`, text: `Chapter: ${door.title}` }))];
  if (doors.length === 0) return null;
  return (
    <Row gap="xs" wrap role="group" aria-label={`Where ${term} comes up`}>
      <Text variant="caption" tone="secondary">
        Where it comes up
      </Text>
      {doors.map((door) => (
        <RouterLink key={`${door.href}-${door.label}`} href={door.href} label={door.label}>
          <Row gap="2xs" paddingHorizontal="sm" paddingVertical="xs" borderRadius="chip" borderWidth={1} borderColor="borderColorStrong" backgroundColor="surface">
            <Icon name={isIconName(door.icon) ? door.icon : "open"} size={14} tone="accent" />
            <Text variant="caption" weight="strong" tone="accent">
              {door.text}
            </Text>
          </Row>
        </RouterLink>
      ))}
    </Row>
  );
}

function countWords(shown: number, total: number, scope: Scope): string {
  const noun = scope === "law" ? "terms that come from a law" : "terms";
  return shown === total ? `${shown} ${noun}` : `${shown} of ${total} ${noun}`;
}

/**
 * Every glossary entry A to Z, narrowed as the reader types, with the law
 * beside each term that rests on one. "Only terms with a law" lists exactly
 * the powers the Handbook can cite.
 */
export function TermsBody() {
  const scrollTo = useScrollToAnchor();
  const openLaw = useOpenAuthority();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const pool = useMemo(() => (scope === "law" ? GLOSSARY.filter((entry) => authoritiesForGlossaryTerm(entry.id).length > 0) : GLOSSARY), [scope]);
  const shown = filterTerms(pool, query);
  const groups = groupByLetter(shown);
  return (
    <Column gap="lg">
      <Column gap="md">
        <Field label="Look up a term" help="Type any word from a term or from what it means.">
          {(control) => <TextInput {...control} kind="search" value={query} onChangeText={setQuery} maxLength={80} icon="review" />}
        </Field>
        <Segmented label="Show" options={[{ value: "all", label: "Every term" }, { value: "law", label: "Only terms that come from a law", icon: "law" }]} value={scope} onChange={setScope} />
        <Text variant="label" tone="secondary" role="status" aria-live="polite">
          {countWords(shown.length, pool.length, scope)}
        </Text>
        <Letters letters={groups.map((group) => group.letter)} />
      </Column>
      {groups.length === 0 ? <Text variant="body">Nothing matches “{query.trim()}”. Try a shorter word or a different one.</Text> : null}
      {groups.map((group) => (
        <Anchor key={group.letter} id={`letter-${group.letter}`}>
          <Column gap="md" role="region" aria-label={`Terms under ${group.letter}`}>
            <Text variant="display" tone="gold" role="heading" aria-level={2}>
              {group.letter}
            </Text>
            {group.entries.map((entry) => (
              <Anchor key={entry.id} id={entry.id}>
                <Column gap="sm">
                  <GlossaryCard entry={glossaryCard(entry)} onLaw={openLaw} onRelated={scrollTo} />
                  <WhereUsed id={entry.id} term={entry.term} />
                </Column>
              </Anchor>
            ))}
          </Column>
        </Anchor>
      ))}
    </Column>
  );
}
