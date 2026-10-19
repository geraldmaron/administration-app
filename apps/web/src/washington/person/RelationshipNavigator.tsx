import { useMemo, useState } from "react";
import { actOf, type Campaign } from "@admin/engine";
import { connectionKindLabel, personFile, publicGraphNeighborhood, publicGraphReach, publicScopeGraph, relationshipScopes, subjectHref, type PersonFile, type PublicGraphLink } from "@admin/player-core";
import { Collection, Field } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { TieMap } from "./PersonVisuals";

const VISUAL_START = 8;
const VISUAL_STEP = 4;
const VISUAL_CAP = 16;
export type RelationshipSearch = { readonly scope?: string; readonly subject?: string; readonly count?: number; readonly query?: string; readonly contact?: string; readonly evidence?: "all" | "recorded" | "inferred" };
type GraphLocation = { readonly scopeId: string; readonly subjectId: string; readonly visualCount: number };

function linkWords(campaign: Campaign, link: PublicGraphLink): string {
  const from = campaign.people[link.from]?.base.name ?? String(link.from);
  const to = campaign.people[link.to]?.base.name ?? String(link.to);
  if (link.contact) return `${from} to ${to} · Recorded issue dialogue · ${link.contact.account}`;
  const edge = link.biography;
  if (!edge) return `${from} and ${to}`;
  const kind = edge.kind === "mentor" ? "Mentorship" : connectionKindLabel(edge.kind, "from");
  return `${from} and ${to} · Inferred ${kind.toLowerCase()} contact · ${edge.reason}`;
}

function ConnectionRow({ campaign, link }: { readonly campaign: Campaign; readonly link: PublicGraphLink }) {
  const from = campaign.people[link.from]?.base.name ?? String(link.from);
  const to = campaign.people[link.to]?.base.name ?? String(link.to);
  const date = link.contact?.date;
  return <li className="public-connection">
    <div className="public-connection__people"><Door href={subjectHref({ kind: "person", id: link.from })}>{from}</Door>
    {link.contact ? " → " : " ↔ "}
    <Door href={subjectHref({ kind: "person", id: link.to })}>{to}</Door>
    </div><p>{link.contact ? `Recorded issue dialogue${date ? ` on ${date.year}-${date.month}-${date.day}` : ""}. ${link.contact.account}`
      : `Inferred biography contact. ${link.biography?.reason ?? ""}`}</p>
  </li>;
}

/** Scope membership selects a public dossier graph; it never manufactures personal trust. */
export function RelationshipNavigator({ campaign, file, search, onSearch }: { readonly campaign: Campaign; readonly file: PersonFile; readonly search?: RelationshipSearch; readonly onSearch?: (search: RelationshipSearch) => void }) {
  const scopes = useMemo(() => relationshipScopes(campaign), [campaign]);
  const [local, setLocal] = useState<RelationshipSearch>({});
  const state = search ?? local;
  const scopeId = state.scope ?? "immediate";
  const subjectId = state.subject ?? String(file.person.id);
  const query = state.query ?? "";
  const visualCount = Math.max(VISUAL_START, Math.min(VISUAL_CAP, state.count ?? VISUAL_START));
  const change = (next: RelationshipSearch) => { if (onSearch) onSearch(next); else setLocal(next); };
  const setQuery = (query: string) => change({ ...state, query });
  const [history, setHistory] = useState<readonly GraphLocation[]>([]);
  const scope = scopes.find((entry) => entry.id === scopeId);
  const members = useMemo(() => scope?.people ?? [file.person.id, ...file.circle.map((row) => row.otherId)], [scope, file]);
  const issue = scopeId.startsWith("issue:") ? campaign.bills[scopeId.slice(6)] : undefined;
  const issueActId = scopeId.startsWith("issue:") ? (issue ? actOf(issue)?.id : undefined) ?? "missing-issue" : undefined;
  const graph = useMemo(() => publicScopeGraph(campaign, members, issueActId), [campaign, members, issueActId]);
  const mostConnected = [...members].sort((a, b) =>
    (graph.adjacency.get(b)?.length ?? 0) - (graph.adjacency.get(a)?.length ?? 0)
    || String(a).localeCompare(String(b)))[0];
  const selected = members.find((id) => id === subjectId) ?? members.find((id) => id === file.person.id) ?? mostConnected;
  const fullSubject = selected === file.person.id ? file : selected ? personFile(campaign, selected) : undefined;
  const directLinks = selected ? graph.adjacency.get(selected) ?? [] : [];
  const neighborhood = selected ? publicGraphNeighborhood(graph, selected, visualCount) : undefined;
  const term = query.trim().toLowerCase();
  const matchingPeople = members.filter((id) => campaign.people[id]?.base.name.toLowerCase().includes(term));
  const matchingLinks = graph.links.filter((link) => linkWords(campaign, link).toLowerCase().includes(term));
  const options = selected && !matchingPeople.includes(selected) ? [selected, ...matchingPeople] : matchingPeople;
  const formalHub = /^(institution:|committee:|chamber:|federal$)/.test(scopeId);
  const scopeLabel = scope?.label ?? "this person's immediate circle";
  const measure = selected ? publicGraphReach(campaign, graph, scopeId, selected).unit : "accepted outgoing issue contacts";
  const remember = () => setHistory((entries) => [...entries, { scopeId, subjectId: String(selected ?? file.person.id), visualCount }]);
  const goBack = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(history.slice(0, -1));
    change({ ...state, scope: previous.scopeId, subject: previous.subjectId, count: previous.visualCount });
  };
  return <div>
    <Field label="Relationship scope">{(control) => <select {...control} className="ui-input" value={scopeId} onChange={(event) => {
      remember(); change({ ...state, scope: event.target.value, subject: String(file.person.id), count: VISUAL_START });
    }}><option value="immediate">This person's immediate circle</option>{scopes.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select>}</Field>
    {scope ? <>
      <p className="hill-note">{scope.evidence} Observed as of {campaign.calendar.year}-{campaign.calendar.month}-{campaign.calendar.day}. Confidence high for public membership, unknown for private trust.</p>
      <Field label="Find an official or connection">{(control) => <input {...control} className="ui-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />}</Field>
      <Field label="Explore an official's ties">{(control) => <select {...control} className="ui-input" value={selected ?? ""} onChange={(event) => {
        remember(); change({ ...state, subject: event.target.value, count: VISUAL_START });
      }}>{options.map((id) => <option key={id} value={id}>{campaign.people[id]?.base.name}</option>)}</select>}</Field>
      <Collection items={matchingPeople} initial={6} noun="officials" empty="No public official matches this scope." render={(id) => {
        const reach = publicGraphReach(campaign, graph, scopeId, id);
        return <li key={id}><Door href={subjectHref({ kind: "person", id })}>{campaign.people[id]?.base.name}</Door> · {reach.value} {reach.unit} in this scope</li>;
      }} />
    </> : null}
    {fullSubject && neighborhood ? <>
      <p className="hill-note">{history.length ? <><button type="button" className="ui-button" onClick={goBack}>Back to previous graph</button>{" · "}</> : null}{scopeLabel} / {fullSubject.person.name}</p>
      <p className="hill-note"><Door href={subjectHref({ kind: "person", id: fullSubject.person.id })}>{fullSubject.person.name}</Door> has {directLinks.length} direct public {directLinks.length === 1 ? "tie" : "ties"} within {scopeLabel}. {scope ? `${scope.people.length} officials are in this public scope. ` : ""}The map shows {neighborhood.nodes.length} connected people, including genuine two-step paths where available. The lists include every official and connection. Open a dossier for evidence and available actions.</p>
      <TieMap campaign={campaign} file={fullSubject} graph={graph} neighborhood={neighborhood} scopeId={scopeId} formalHub={formalHub} />
      {visualCount < VISUAL_CAP && neighborhood.nodes.length < neighborhood.reachable ? <button type="button" className="ui-button" onClick={() => change({ ...state, count: Math.min(VISUAL_CAP, visualCount + VISUAL_STEP) })}>Show more connected people</button> : null}
      <p className="hill-note">Legend: dashed lines are inferred biography contacts; solid arrows show recorded issue dialogue in its actual direction. {formalHub ? "Gold spokes show formal membership, not personal trust. " : ""}Face size reflects {measure} in this scope. Neither contact nor office establishes private trust or a vote commitment.</p>
      <Collection items={directLinks} initial={8} noun="ties to this official" empty="No direct public ties are recorded for this official in this scope." render={(link) => <ConnectionRow key={link.id} campaign={campaign} link={link} />} />
      {scope ? <>
        <h3 className="exec__heading">Connections across this scope</h3>
        <Collection items={matchingLinks} initial={8} noun="public connections" empty="No public connection matches this scope and search." render={(link) => <ConnectionRow key={link.id} campaign={campaign} link={link} />} />
      </> : null}
    </> : null}
  </div>;
}
