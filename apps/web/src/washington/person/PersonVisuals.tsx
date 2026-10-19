import type { Campaign } from "@admin/engine";
import { connectionTone, publicGraphNeighborhood, publicGraphReach, subjectHref, type PersonFile, type PublicGraphLink, type PublicGraphNeighborhood, type PublicGraphReach, type PublicScopeGraph } from "@admin/player-core";
import type { PersonId } from "@admin/world";
import { Icon, Portrait, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";

// The person file's drawn pieces: the circle as a map of faces around the
// subject, and a career as bands along the years of a life.

type CareerPost = PersonFile["person"]["career"][number];

const CAREER_MARK: Readonly<Record<CareerPost["archetype"], IconName>> = {
  "civil-service": "building",
  "military-command": "instrumentMilitary",
  "intelligence-service": "intel",
  "diplomatic-corps": "instrumentDiplomatic",
  "private-law": "gavel",
  business: "sectorFinance",
  academia: "dossier",
  "party-organizing": "ballot",
  "local-government": "mapPin",
  "state-media": "formatRadio",
  "independent-press": "press",
  activism: "eventUnrest",
  medicine: "sectorHealthcare",
  "labor-union": "sectorSteelHeavy",
  judiciary: "court",
};

/** The mark each reading is drawn with. */
export const READING_MARK: Readonly<Record<string, IconName>> = {
  competence: "graph",
  loyalty: "shield",
  integrity: "law",
  charisma: "microphone",
  ambition: "escalate",
};

/**
 * A working life as bands along the years it covers, each as long as the
 * stint was, with its field's mark, ending at today's age. A gap is drawn as
 * a gap.
 */
export function CareerBands({ posts, age, labels }: { readonly posts: readonly CareerPost[]; readonly age: number; readonly labels: readonly string[] }) {
  if (posts.length === 0) return null;
  const start = Math.min(...posts.map((post) => post.startAge));
  const span = Math.max(1, age - start);
  return (
    <ol className="career-bands" aria-label="Career by years">
      {posts.map((post, index) => {
        const from = ((post.startAge - start) / span) * 100;
        const width = Math.max(4, (post.years / span) * 100);
        return (
          <li key={index} className="career-band">
            <span className="career-band__mark" aria-hidden="true">
              <Icon name={CAREER_MARK[post.archetype]} size={16} />
            </span>
            <span className="career-band__what">{labels[index] ?? post.archetype}</span>
            <span className="career-band__track" aria-hidden="true">
              <span className="career-band__fill" style={{ insetInlineStart: `${from}%`, inlineSize: `${Math.min(width, 100 - from)}%` }} />
            </span>
            <span className="career-band__when">
              {post.startAge} to {post.startAge + post.years}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type Point = { readonly x: number; readonly y: number };
type GraphLayout = {
  readonly points: ReadonlyMap<PersonId, Point>;
  readonly height: number;
  readonly directHeading: number | undefined;
  readonly secondHeading: number | undefined;
};

const GRAPH_COLUMNS = [18, 50, 82] as const;
const GRAPH_ROW = 108;
const GRAPH_FIRST_ROW = 184;

/** Full neighborhood counts fix both groups' positions before the visual prefix expands. */
function graphLayout(subject: PersonId, full: PublicGraphNeighborhood): GraphLayout {
  const direct = full.nodes.filter((node) => node.depth === 1);
  const second = full.nodes.filter((node) => node.depth === 2);
  const directRows = Math.ceil(direct.length / GRAPH_COLUMNS.length);
  const secondStart = GRAPH_FIRST_ROW + directRows * GRAPH_ROW + 104;
  const points = new Map<PersonId, Point>([[subject, { x: 50, y: 52 }]]);
  for (const [index, node] of direct.entries()) points.set(node.id, {
    x: GRAPH_COLUMNS[index % GRAPH_COLUMNS.length]!, y: GRAPH_FIRST_ROW + Math.floor(index / GRAPH_COLUMNS.length) * GRAPH_ROW,
  });
  for (const [index, node] of second.entries()) points.set(node.id, {
    x: GRAPH_COLUMNS[index % GRAPH_COLUMNS.length]!, y: secondStart + Math.floor(index / GRAPH_COLUMNS.length) * GRAPH_ROW,
  });
  const lastRow = second.length ? secondStart + (Math.ceil(second.length / GRAPH_COLUMNS.length) - 1) * GRAPH_ROW
    : direct.length ? GRAPH_FIRST_ROW + (directRows - 1) * GRAPH_ROW : 52;
  return { points, height: lastRow + 84, directHeading: direct.length ? GRAPH_FIRST_ROW - 78 : undefined,
    secondHeading: second.length ? secondStart - 78 : undefined };
}

function lineTone(link: PublicGraphLink): string | undefined {
  return link.biography ? connectionTone(link.biography.kind) : undefined;
}

function GraphLines({ neighborhood, points, height, marker, formalHub }: {
  readonly neighborhood: PublicGraphNeighborhood;
  readonly points: ReadonlyMap<PersonId, Point>;
  readonly height: number;
  readonly marker: string;
  readonly formalHub: boolean;
}) {
  return <svg className="tie-map__lines" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor" /></marker></defs>
    {formalHub ? neighborhood.nodes.map((node) => {
      const point = points.get(node.id)!;
      return <line key={`member:${node.id}`} x1="50" y1="20" x2={point.x} y2={point.y} className="tie-map__membership" />;
    }) : null}
    {neighborhood.links.map((link) => {
      const from = points.get(link.from);
      const to = points.get(link.to);
      if (!from || !to) return null;
      return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        markerEnd={link.evidence === "recorded" ? `url(#${marker})` : undefined}
        strokeDasharray={link.evidence === "inferred" ? "2 2" : undefined}
        className="tie-map__line" data-tone={lineTone(link)}
        style={{ strokeWidth: link.biography ? 0.4 + link.biography.strength * 1.2 : 1.5 }} />;
    })}
  </svg>;
}

/** Public links around a selected official; the complete edge list stays below the map. */
export function TieMap({ campaign, file, graph, neighborhood, scopeId, formalHub }: {
  readonly campaign: Campaign;
  readonly file: PersonFile;
  readonly graph: PublicScopeGraph;
  readonly neighborhood: PublicGraphNeighborhood;
  readonly scopeId: string;
  readonly formalHub: boolean;
}) {
  const layout = graphLayout(file.person.id, publicGraphNeighborhood(graph, file.person.id, 16));
  const { points } = layout;
  const marker = `issue-arrow-${file.person.id}`;
  const summary = neighborhood.nodes.map((node) => `${campaign.people[node.id]?.base.name ?? node.id}, ${node.depth === 2 ? "two-hop" : "direct"}`).join("; ");
  return <div className="tie-map" role="group" aria-label={`${file.person.name}'s circle: ${summary || "no personal links displayed"}${formalHub ? "; formal public membership shown separately" : ""}`}>
    <div className="tie-map__plot" style={{ blockSize: layout.height }}>
      <GraphLines neighborhood={neighborhood} points={points} height={layout.height} marker={marker} formalHub={formalHub} />
      {formalHub ? <span className="tie-map__hub">Formal membership</span> : null}
      {layout.directHeading !== undefined ? <span className="tie-map__group-label" style={{ top: layout.directHeading }}>Direct public ties</span> : null}
      {layout.secondHeading !== undefined ? <span className="tie-map__group-label" style={{ top: layout.secondHeading }}>Two-step public ties</span> : null}
      <span className="tie-map__subject" style={{ top: points.get(file.person.id)!.y }}>
        <Portrait name={file.person.name} size="md" redacted decorative />
      </span>
      {neighborhood.nodes.map((node) => <GraphNode key={node.id} campaign={campaign} node={node} point={points.get(node.id)!}
        links={neighborhood.links} reach={publicGraphReach(campaign, graph, scopeId, node.id)} />)}
    </div>
  </div>;
}

function GraphNode({ campaign, node, point, links, reach }: {
  readonly campaign: Campaign;
  readonly node: PublicGraphNeighborhood["nodes"][number];
  readonly point: Point;
  readonly links: readonly PublicGraphLink[];
  readonly reach: PublicGraphReach;
}) {
  const name = campaign.people[node.id]?.base.name ?? String(node.id);
  const recorded = links.some((edge) => edge.evidence === "recorded" && (edge.from === node.id || edge.to === node.id));
  const biography = links.find((edge) => edge.biography && (edge.from === node.id || edge.to === node.id))?.biography;
  return <Door href={subjectHref({ kind: "person", id: node.id })} className="tie-map__node"
    data-tone={biography ? connectionTone(biography.kind) : undefined}
    style={{ left: `${point.x}%`, top: point.y }}
    aria-label={`${name}, ${node.depth === 2 ? "two-hop public connection" : "direct public connection"}; ${recorded ? "recorded issue dialogue" : "inferred biography contact"}; ${reach.value} ${reach.unit} in this scope`}>
    <span className="tie-map__face" style={{ transform: `scale(${1 + Math.min(0.28, reach.value * 0.06)})` }}><Portrait name={name} size="sm" redacted decorative /></span>
    <span className="tie-map__name">{name.split(" ").slice(-1)[0]}</span>
    <span className="tie-map__kind">{node.depth === 2 ? "Two steps" : recorded ? "Recorded" : "Inferred"}</span>
  </Door>;
}
