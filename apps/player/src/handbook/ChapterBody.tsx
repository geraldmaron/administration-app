import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { PLACES, authorityById, chapterForExplainer, explainer, type HandbookChapter, type LawChapter } from "@admin/player-core";
import { CardGrid, Column, Icon, Pressable, Row, Surface, Text, isIconName } from "@admin/ui";
import { Anchor, ExplainerBody, GlossaryCard, LawCard, useScrollToAnchor } from "@admin/ui/handbook";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { RouterLink } from "../shell/RouterLink";
import { chapterHref, chapterNeighbors, chapterTerms, explainerRefs, glossaryCard, glossaryCardById, isLawChapter, lawSectionCards, termRefs } from "./selectors";

function SectionHeading({ title, eyebrow }: { readonly title: string; readonly eyebrow?: string }) {
  return (
    <Column gap="2xs">
      {eyebrow ? (
        <Text variant="eyebrow" tone="gold">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="heading" role="heading" aria-level={2}>
        {title}
      </Text>
    </Column>
  );
}

function openSource(id: string): void {
  const url = authorityById(id)?.sourceUrl;
  if (!url) return;
  Linking.openURL(url).catch((cause: unknown) => console.warn("The primary source could not be opened.", cause));
}

/** The chapter on the law: each power a President reaches for, and every authority it rests on as a card that opens the law. */
function LawSections({ chapter }: { readonly chapter: LawChapter }) {
  const openLaw = useOpenAuthority();
  return (
    <Column gap="2xl">
      {chapter.sections.map((section, index) => (
        <Anchor key={section.id} id={section.id}>
          <Column gap="md" role="region" aria-label={section.title}>
            <SectionHeading eyebrow={`Section ${index + 1} of ${chapter.sections.length}`} title={section.title} />
            <Text variant="body" tone="secondary" maxWidth={760}>
              {section.summary}
            </Text>
            <CardGrid columns={{ phone: 1, tablet: 1, desktop: 1, wide: 2 }} gap="lg">
              {lawSectionCards(section).map((law) => (
                <Column key={law.id} flexGrow={1}>
                  <LawCard law={law} onOpen={() => openLaw(law.cite)} onSource={() => openSource(law.id)} />
                </Column>
              ))}
            </CardGrid>
          </Column>
        </Anchor>
      ))}
    </Column>
  );
}

/** A jump list to the law chapter's sections, so a reader can go straight to the power they are about to use. */
function LawIndex({ chapter }: { readonly chapter: LawChapter }) {
  const scrollTo = useScrollToAnchor();
  return (
    <Surface level="raised" pad="md" accentEdge="gold" role="navigation" aria-label="Sections of the law">
      <Column gap="sm">
        <Text variant="eyebrow" tone="gold">
          In this chapter
        </Text>
        <Row gap="xs" wrap>
          {chapter.sections.map((section) => (
            <SectionJump href={`#${section.id}`} key={section.id} label={section.title} count={section.authorities.length} onPress={() => scrollTo(section.id)} />
          ))}
        </Row>
      </Column>
    </Surface>
  );
}

function SectionJump({ href, label, count, onPress }: { readonly href: string; readonly label: string; readonly count: number; readonly onPress: () => void }) {
  return (
    <Pressable href={href} onPress={onPress} role="link" aria-label={`${label}, ${count} laws cited`} borderWidth={1} borderColor="borderColorStrong" borderRadius="chip" paddingHorizontal="sm" paddingVertical="xs" backgroundColor={{ default: "surface", hover: "surfaceHover" }}>
      <Row gap="xs">
        <Icon name="law" size={14} tone="gold" />
        <Text variant="caption" weight="strong">
          {label}
        </Text>
        <Text variant="caption" tone="tertiary">
          {count}
        </Text>
      </Row>
    </Pressable>
  );
}

function Explainers({ chapter }: { readonly chapter: HandbookChapter }) {
  const router = useRouter();
  const openLaw = useOpenAuthority();
  const scrollTo = useScrollToAnchor();
  const open = (id: string) => {
    const home = chapterForExplainer(id);
    if (!home) return;
    if (home.id === chapter.id) scrollTo(id);
    else router.push(`${chapterHref(home.id)}?at=${encodeURIComponent(id)}` as never);
  };
  return (
    <>
      {chapter.explainers.flatMap((id) => explainer(id) ?? []).map((item) => (
        <Anchor key={item.id} id={item.id}>
          <Surface level="raised" pad="lg" role="region" aria-label={item.title}>
            <Column gap="md">
              <SectionHeading title={item.title} />
              <ExplainerBody explainer={item} terms={termRefs(item.terms ?? [])} termCard={glossaryCardById} next={explainerRefs(item.next ?? [])} onNext={open} onLaw={openLaw} />
            </Column>
          </Surface>
        </Anchor>
      ))}
    </>
  );
}

function Terms({ chapter }: { readonly chapter: HandbookChapter }) {
  const openLaw = useOpenAuthority();
  const terms = chapterTerms(chapter);
  if (terms.length === 0) return null;
  return (
    <Column gap="md">
      <SectionHeading title="Terms in this chapter" />
      {terms.map((entry) => (
        <GlossaryCard key={entry.id} entry={glossaryCard(entry)} onLaw={openLaw} />
      ))}
    </Column>
  );
}

function Places({ chapter }: { readonly chapter: HandbookChapter }) {
  return (
    <Column gap="md">
      <SectionHeading title="Where you use this" />
      <Row gap="sm" wrap>
        {chapter.places.map((key) => (
          <RouterLink key={key} href={PLACES[key].href} label={`Open ${PLACES[key].title}`}>
            <Surface level="raised" pad="md" interactive>
              <Row gap="sm">
                <Icon name={isIconName(PLACES[key].icon) ? PLACES[key].icon : "open"} size={20} tone="accent" />
                <Text variant="label">{PLACES[key].title}</Text>
                <Icon name="chevron" size={16} tone="colorTertiary" />
              </Row>
            </Surface>
          </RouterLink>
        ))}
      </Row>
    </Column>
  );
}

function PagerLink({ id, title, side }: { readonly id: string; readonly title: string; readonly side: "previous" | "next" }) {
  return (
    <RouterLink href={chapterHref(id)} label={`${side === "previous" ? "Previous" : "Next"} chapter: ${title}`}>
      <Surface level="raised" pad="md" interactive minWidth={220}>
        <Column gap="2xs" alignItems={side === "next" ? "flex-end" : "flex-start"}>
          <Text variant="caption" tone="secondary">
            {side === "previous" ? "Previous chapter" : "Next chapter"}
          </Text>
          <Text variant="label">{title}</Text>
        </Column>
      </Surface>
    </RouterLink>
  );
}

function Pager({ id }: { readonly id: string }) {
  const { previous, next } = chapterNeighbors(id);
  return (
    <Row gap="md" between wrap role="navigation" aria-label="Chapter order">
      {previous ? <PagerLink id={previous.id} title={previous.title} side="previous" /> : <Column />}
      {next ? <PagerLink id={next.id} title={next.title} side="next" /> : null}
    </Row>
  );
}

/** One chapter's body: its explainers or, for the law, its sections of authorities; the terms it teaches; the screens where it applies; and the way on. */
export function ChapterBody({ chapter }: { readonly chapter: HandbookChapter }) {
  return (
    <Column gap="2xl">
      {isLawChapter(chapter) ? (
        <>
          <LawIndex chapter={chapter} />
          <LawSections chapter={chapter} />
        </>
      ) : (
        <Explainers chapter={chapter} />
      )}
      <Terms chapter={chapter} />
      <Places chapter={chapter} />
      <Pager id={chapter.id} />
    </Column>
  );
}
