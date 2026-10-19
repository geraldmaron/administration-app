import type { Campaign } from "@admin/engine";
import { connectionKindLabel, connectionTone, publicGraphNeighborhood, publicGraphReach, type PersonConnectionRow, type PublicGraphLink, type PublicGraphNeighborhood, type PublicGraphReach, type PublicScopeGraph } from "@admin/player-core";
import type { PersonId } from "@admin/world";
import type { ReadTone, TieLinkView, TieMapProps, TieNodeView } from "@admin/ui/dossier";

// The relationship map's geometry and words: who sits where around the
// subject, which lines join them, and what each line is evidence of. Pure, so
// the map and its list read the same rows.

export const VISUAL_START = 8;
export const VISUAL_STEP = 4;
export const VISUAL_CAP = 16;

const COLUMNS = [18, 50, 82] as const;
const ROW = 108;
const FIRST_ROW = 184;

type Point = { readonly x: number; readonly y: number };

const TONE: Readonly<Record<"favorable" | "adverse" | "neutral", ReadTone>> = { favorable: "good", adverse: "bad", neutral: "neutral" };

/** Positions fixed by the full neighborhood, so the map does not jump as more faces are shown. */
function layout(subject: PersonId, full: PublicGraphNeighborhood): { readonly points: ReadonlyMap<PersonId, Point>; readonly height: number; readonly headings: TieMapProps["headings"] } {
  const direct = full.nodes.filter((node) => node.depth === 1);
  const second = full.nodes.filter((node) => node.depth === 2);
  const directRows = Math.ceil(direct.length / COLUMNS.length);
  const secondStart = FIRST_ROW + directRows * ROW + 104;
  const at = (index: number, top: number): Point => ({ x: COLUMNS[index % COLUMNS.length]!, y: top + Math.floor(index / COLUMNS.length) * ROW });
  const points = new Map<PersonId, Point>([[subject, { x: 50, y: 52 }], ...direct.map((node, index) => [node.id, at(index, FIRST_ROW)] as const), ...second.map((node, index) => [node.id, at(index, secondStart)] as const)]);
  const lastRow = second.length ? secondStart + (Math.ceil(second.length / COLUMNS.length) - 1) * ROW : direct.length ? FIRST_ROW + (directRows - 1) * ROW : 52;
  return {
    points,
    height: lastRow + 84,
    headings: [...(direct.length ? [{ label: "They know directly", y: FIRST_ROW - 78 }] : []), ...(second.length ? [{ label: "They know through someone", y: secondStart - 78 }] : [])],
  };
}

const nameOf = (campaign: Campaign, id: PersonId): string => campaign.people[id]?.base.name ?? String(id);

function nodeView(campaign: Campaign, graph: PublicScopeGraph, scopeId: string, neighborhood: PublicGraphNeighborhood, node: PublicGraphNeighborhood["nodes"][number], point: Point): TieNodeView {
  const name = nameOf(campaign, node.id);
  const touches = (edge: PublicGraphLink) => edge.from === node.id || edge.to === node.id;
  const recorded = neighborhood.links.some((edge) => edge.evidence === "recorded" && touches(edge));
  const biography = neighborhood.links.find((edge) => edge.biography && touches(edge))?.biography;
  const reach = publicGraphReach(campaign, graph, scopeId, node.id);
  const kind = node.depth === 2 ? "Through someone" : recorded ? "Have talked" : "Probably know";
  return {
    id: node.id,
    name,
    x: point.x,
    y: point.y,
    kind,
    tone: biography ? TONE[connectionTone(biography.kind)] : "neutral",
    reach: reach.value,
    spoken: `${name}, ${node.depth === 2 ? "connected through someone else" : "connected directly"}, ${recorded ? "they have talked about an issue" : "staff think they know each other"}. ${reachSpoken(reach)} Open their profile`,
  };
}

/** What a face's size counts, said aloud for one person. */
function reachSpoken(reach: PublicGraphReach): string {
  if (reach.unit === "formal posts held") return `Holds ${reach.value} ${reach.value === 1 ? "post" : "posts"} in this group.`;
  return `${reach.value} ${reach.value === 1 ? "person" : "people"} in this group took their call.`;
}

/** The legend line for face size, in the words of what it counts. */
export function reachLegend(unit: PublicGraphReach["unit"]): string {
  return unit === "formal posts held" ? "A bigger face means they hold more posts in this group." : "A bigger face means more people in this group took their call.";
}

/** How many of a person's ties are talks staff saw and how many are guesses from their backgrounds. */
export function circleWords(rows: readonly PersonConnectionRow[]): string {
  if (rows.length === 0) return "Staff haven't found anyone they're connected to yet.";
  const talkedWith = new Set(rows.filter((row) => row.observed).map((row) => row.otherId));
  const talked = talkedWith.size;
  const guessed = new Set(rows.filter((row) => !row.observed && !talkedWith.has(row.otherId)).map((row) => row.otherId)).size;
  const people = (count: number) => `${count} ${count === 1 ? "person" : "people"}`;
  const spoke = talked > 0 ? `They've talked about issues with ${people(talked)}.` : "";
  const known = guessed > 0 ? `Staff think they know ${talked > 0 ? `${guessed} more` : people(guessed)} from their backgrounds.` : "";
  return [spoke, known].filter(Boolean).join(" ");
}

/** The map around one official: faces placed, lines drawn, every node a door. */
export function tieMap(campaign: Campaign, subject: PersonId, graph: PublicScopeGraph, scopeId: string, visualCount: number, formalHub: boolean): Omit<TieMapProps, "onOpen"> {
  const neighborhood = publicGraphNeighborhood(graph, subject, visualCount);
  const geometry = layout(subject, publicGraphNeighborhood(graph, subject, VISUAL_CAP));
  const pointOf = (id: PersonId): Point | undefined => geometry.points.get(id);
  const nodes = neighborhood.nodes.flatMap((node) => {
    const point = pointOf(node.id);
    return point ? [nodeView(campaign, graph, scopeId, neighborhood, node, point)] : [];
  });
  const links: readonly TieLinkView[] = neighborhood.links.flatMap((link) => {
    const from = pointOf(link.from);
    const to = pointOf(link.to);
    if (!from || !to) return [];
    return [{ id: link.id, from, to, evidence: link.evidence, tone: link.biography ? TONE[connectionTone(link.biography.kind)] : "neutral", strength: link.biography?.strength ?? 0.6 }];
  });
  const subjectPoint = pointOf(subject) ?? { x: 50, y: 52 };
  const summary = nodes.map((node) => `${node.name}, ${node.kind.toLowerCase()}`).join("; ");
  return {
    subject: { name: nameOf(campaign, subject), ...subjectPoint },
    nodes,
    links,
    height: geometry.height,
    headings: geometry.headings,
    formalHub,
    label: `${nameOf(campaign, subject)}'s connections: ${summary || "nobody shown"}${formalHub ? ". Group membership is shown with gold lines" : ""}`,
  };
}

/** One public connection in words, for the list that holds every tie the map may not draw. */
export function linkWords(campaign: Campaign, link: PublicGraphLink): string {
  const from = nameOf(campaign, link.from);
  const to = nameOf(campaign, link.to);
  if (link.contact) return `${from} to ${to} · Talked about an issue · ${link.contact.account}`;
  const edge = link.biography;
  if (!edge) return `${from} and ${to}`;
  const kind = edge.kind === "mentor" ? "Mentorship" : connectionKindLabel(edge.kind, "from");
  return `${from} and ${to} · Probably know each other · ${kind} · ${edge.reason}`;
}

/** Scopes whose membership is formal (an institution, a committee, a chamber), drawn as spokes rather than personal ties. */
export function isFormalHub(scopeId: string): boolean {
  return /^(institution:|committee:|chamber:|federal$)/.test(scopeId);
}
