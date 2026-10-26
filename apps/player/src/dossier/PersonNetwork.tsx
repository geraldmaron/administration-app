import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { actOf, type Campaign } from "@admin/engine";
import { connectionKindLabel, connectionTone, formatDate, personFile, publicGraphNeighborhood, publicGraphReach, publicScopeGraph, relationshipScopes, subjectHref, type PersonFile, type PublicGraphLink } from "@admin/player-core";
import type { PersonId } from "@admin/world";
import { Empty, Tag, Button, Column, ReadingFrame, Row, Surface, Text } from "@admin/ui";
import { Segmented, Select, TextInput } from "@admin/ui/forms";
import { TieMap, tieKeyEntries } from "@admin/ui/dossier";
import { termDoor } from "../handbook/term-door";
import { LinkText, RowTo } from "../executive/parts";
import { PersonFace } from "./PersonFace";
import { PersonName } from "./PersonPeek";
import { FilePart } from "./parts";
import { VISUAL_CAP, VISUAL_START, VISUAL_STEP, circleWords, isFormalHub, linkWords, reachLegend, tieMap } from "./network-view";

export type NetworkSearch = { readonly scope?: string; readonly subject?: string; readonly count?: number; readonly query?: string; readonly contact?: string; readonly evidence?: "all" | "recorded" | "inferred" };

const TIE_STATUS = { favorable: "success", adverse: "danger", neutral: "outline" } as const;
const PAGE = 8;

function More({ total, shown, onMore }: { readonly total: number; readonly shown: number; readonly onMore: () => void }) {
  if (total <= shown) return null;
  return (
    <Button kind="quiet" size="compact" onPress={onMore}>
      {`Show all ${total}`}
    </Button>
  );
}

function connectionWords(link: PublicGraphLink): string {
  const date = link.contact?.date;
  return link.contact ? `Talked about an issue${date ? ` on ${formatDate(date)}` : ""}. ${link.contact.account}` : `Staff think they know each other from their backgrounds. ${link.biography?.reason ?? ""}`;
}

/**
 * One tie in the group. A tie that touches the person being shown opens the
 * other person from anywhere along the row; a tie between two others has two
 * equal doors, so each name stays its own link.
 */
function ConnectionRow({ campaign, link, selected, first }: { readonly campaign: Campaign; readonly link: PublicGraphLink; readonly selected: PersonId; readonly first: boolean }) {
  const name = (id: PersonId) => campaign.people[id]?.base.name ?? String(id);
  const arrow = (
    <Text variant="label" tone="tertiary">
      {link.contact ? "→" : "↔"}
    </Text>
  );
  const other = link.from === selected ? link.to : link.to === selected ? link.from : undefined;
  if (other === undefined) {
    return (
      <Column gap="2xs" padding="sm" borderTopWidth={first ? 0 : 1} borderTopColor="borderColor">
        <Row gap="xs" wrap>
          <LinkText href={subjectHref({ kind: "person", id: link.from })} label={`Open ${name(link.from)}'s file`}>{name(link.from)}</LinkText>
          {arrow}
          <LinkText href={subjectHref({ kind: "person", id: link.to })} label={`Open ${name(link.to)}'s file`}>{name(link.to)}</LinkText>
        </Row>
        <Text variant="caption" tone="secondary">
          {connectionWords(link)}
        </Text>
      </Column>
    );
  }
  return (
    <RowTo first={first} href={subjectHref({ kind: "person", id: other })} label={`Open ${name(other)}'s file`}>
      <Column gap="2xs" padding="sm">
        <Row gap="xs" wrap>
          <PersonName campaign={campaign} id={link.from} name={name(link.from)} />
          {arrow}
          <PersonName campaign={campaign} id={link.to} name={name(link.to)} />
        </Row>
        <Text variant="caption" tone="secondary">
          {connectionWords(link)}
        </Text>
      </Column>
    </RowTo>
  );
}

/** Scope membership selects a public graph; it never manufactures personal trust. */
function Navigator({ campaign, file, state, change }: { readonly campaign: Campaign; readonly file: PersonFile; readonly state: NetworkSearch; readonly change: (next: NetworkSearch) => void }) {
  const router = useRouter();
  const scopes = useMemo(() => relationshipScopes(campaign), [campaign]);
  const [allLinks, setAllLinks] = useState(false);
  const scopeId = state.scope ?? "immediate";
  const scope = scopes.find((entry) => entry.id === scopeId);
  const members = useMemo(() => scope?.people ?? [file.person.id, ...file.circle.map((row) => row.otherId)], [scope, file]);
  const issue = scopeId.startsWith("issue:") ? campaign.bills[scopeId.slice(6)] : undefined;
  const issueActId = scopeId.startsWith("issue:") ? ((issue ? actOf(issue)?.id : undefined) ?? "missing-issue") : undefined;
  const graph = useMemo(() => publicScopeGraph(campaign, members, issueActId), [campaign, members, issueActId]);
  const selected = members.find((id) => id === (state.subject ?? file.person.id)) ?? members[0];
  const count = Math.max(VISUAL_START, Math.min(VISUAL_CAP, state.count ?? VISUAL_START));
  const term = (state.query ?? "").trim().toLowerCase();
  const matchingLinks = graph.links.filter((link) => linkWords(campaign, link).toLowerCase().includes(term));
  if (!selected) return null;
  const subject = selected === file.person.id ? file : personFile(campaign, selected);
  const neighborhood = publicGraphNeighborhood(graph, selected, count);
  const direct = graph.adjacency.get(selected) ?? [];
  const map = tieMap(campaign, selected, graph, scopeId, count, isFormalHub(scopeId));
  const shown = allLinks ? matchingLinks : matchingLinks.slice(0, PAGE);
  return (
    <Column gap="md">
      <Select label="Group to show" value={scopeId} onChange={(next) => change({ ...state, scope: next, subject: String(file.person.id), count: VISUAL_START })} options={[{ value: "immediate", label: "People closest to them" }, ...scopes.map((entry) => ({ value: entry.id, label: entry.label }))]} />
      {scope ? <Text variant="caption" tone="secondary">{`${scope.evidence} Up to date as of ${formatDate(campaign.calendar)}. Staff know who belongs to this group, but not who trusts whom in private.`}</Text> : null}
      {scope ? <Select label="Show connections for" value={String(selected)} onChange={(next) => change({ ...state, subject: next, count: VISUAL_START })} options={members.map((id) => ({ value: String(id), label: campaign.people[id]?.base.name ?? String(id) }))} /> : null}
      <Text variant="body">{`${subject?.person.name ?? "This person"} has ${direct.length} direct ${direct.length === 1 ? "connection" : "connections"} in this group. The map shows ${neighborhood.nodes.length} people, including any they know only through someone else.`}</Text>
      <ReadingFrame title="Who knows whom in this group" unit={`${neighborhood.nodes.length} people, drawn as faces`} period="From public records and staff notes" legend={tieKeyEntries({ nodes: map.nodes, links: map.links, formalHub: map.formalHub ?? false })} pressHint="Press a face to open that person's file." help={{ meaning: "Each face is a person and each line a connection staff know of. A ring or line in green means good terms, red means at odds, gray means no known leaning. An arrow means they talked about an issue and points away from the one who reached out. A dashed line is staff inference from backgrounds.", term: termDoor("hill-mood", "how people feel about you") }}>
        <TieMap {...map} nodes={map.nodes.map((node) => ({ ...node, href: subjectHref({ kind: "person", id: node.id }) }))} keyed={false} onOpen={(id) => router.push(subjectHref({ kind: "person", id }) as never)} />
      </ReadingFrame>
      {count < VISUAL_CAP && neighborhood.nodes.length < neighborhood.reachable ? (
        <Row>
          <Button kind="secondary" size="compact" icon="layerBlocs" onPress={() => change({ ...state, count: Math.min(VISUAL_CAP, count + VISUAL_STEP) })}>
            Show more people
          </Button>
        </Row>
      ) : null}
      <Text variant="caption" tone="tertiary">{`${reachLegend(publicGraphReach(campaign, graph, scopeId, selected).unit)} Knowing someone or working together doesn't prove they trust each other or will vote together.`}</Text>
      <TextInput kind="search" label="Search people and connections" placeholder="Search people and connections" value={state.query ?? ""} onChangeText={(query) => change({ ...state, query: query.slice(0, 120) })} />
      <Surface pad="none" overflow="hidden">
        {shown.length === 0 ? <Empty title="No one in this group matches" detail="No one in this group matches the search." /> : shown.map((link, index) => <ConnectionRow key={link.id} campaign={campaign} link={link} selected={selected} first={index === 0} />)}
      </Surface>
      <More total={matchingLinks.length} shown={shown.length} onMore={() => setAllLinks(true)} />
    </Column>
  );
}

function Ties({ campaign, file, state, change }: { readonly campaign: Campaign; readonly file: PersonFile; readonly state: NetworkSearch; readonly change: (next: NetworkSearch) => void }) {
  const [all, setAll] = useState(false);
  const query = (state.contact ?? "").toLowerCase().trim();
  const kind = state.evidence ?? "all";
  const rows = file.circle.filter((row) => (kind === "all" || (kind === "recorded" ? !!row.observed : !row.observed)) && `${row.otherName} ${row.edge.reason}`.toLowerCase().includes(query));
  const shown = all ? rows : rows.slice(0, PAGE);
  return (
    <Column gap="sm">
      <TextInput kind="search" label="Search their connections" placeholder="Search their connections" value={state.contact ?? ""} onChangeText={(contact) => change({ ...state, contact: contact.slice(0, 120) })} />
      <Segmented<"all" | "recorded" | "inferred"> label="Show" value={kind} onChange={(evidence) => change({ ...state, evidence })} options={[{ value: "all", label: "All" }, { value: "recorded", label: "Have talked" }, { value: "inferred", label: "Probably know each other" }]} />
      {rows.length === 0 ? <Text variant="body" tone="secondary">{file.circle.length === 0 ? "Staff haven't found anyone they're connected to yet." : "Nobody matches the search and filter."}</Text> : null}
      {shown.length > 0 ? (
        <Surface pad="none" overflow="hidden">
          {shown.map((row, index) => {
            const tone = connectionTone(row.edge.kind);
            return (
              <RowTo key={`${row.otherId}:${row.edge.kind}`} first={index === 0} href={subjectHref({ kind: "person", id: row.otherId })} label={`Open ${row.otherName}'s file`}>
                <Row gap="sm" top padding="sm">
                  <PersonFace campaign={campaign} id={row.otherId} name={row.otherName} size={36} />
                  <Column flex={1} gap="2xs">
                    <Row gap="sm" wrap>
                      <PersonName campaign={campaign} id={row.otherId} name={row.otherName} />
                      <Tag tone={TIE_STATUS[tone]}>{row.observed ? "Have talked" : connectionKindLabel(row.edge.kind, row.subjectEnd)}</Tag>
                    </Row>
                    <Text variant="caption" tone="secondary">
                      {row.observed ? `${row.observed.direction === "outgoing" ? `They reached out to ${row.otherName}` : `${row.otherName} reached out to them`} about an issue on ${formatDate(row.observed.date)}. Staff are sure the talk happened, but it doesn't promise a vote. ` : "Staff think they know each other from their backgrounds, but can't confirm they trust each other or work together. "}
                      {row.edge.reason}
                    </Text>
                  </Column>
                </Row>
              </RowTo>
            );
          })}
        </Surface>
      ) : null}
      <More total={rows.length} shown={shown.length} onMore={() => setAll(true)} />
    </Column>
  );
}

/** Who the person knows in public: the map of faces around them in a chosen scope, and every tie in a list. */
export function PersonNetwork({ campaign, file, search, onSearch }: { readonly campaign: Campaign; readonly file: PersonFile; readonly search: NetworkSearch; readonly onSearch: (next: NetworkSearch) => void }) {
  return (
    <Column gap="xl">
      <FilePart title="Who they know" note={`${circleWords(file.circle)} The map shows up to ${VISUAL_START} people at first, and you can add more. The list below has everyone.`}>
        <Navigator campaign={campaign} file={file} state={search} change={onSearch} />
      </FilePart>
      <FilePart title="Their connections">
        <Ties campaign={campaign} file={file} state={search} change={onSearch} />
      </FilePart>
    </Column>
  );
}
