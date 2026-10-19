import type { Bill, Campaign } from "@admin/engine";
import { place, type HillPostReading } from "@admin/player-core";
import { Button, Card, CardHeader, CardContent, Collection, Gauge, Icon, PartyMark, Portrait, Tag } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import { toneOf, valenceOf } from "../../shell/valence";
import { useHillCommit } from "./HillAct";
import { LobbyActs } from "./LobbyActs";
import "./congress.css";
import "./tables.css";

export type PostContext = { readonly bill: Bill };

function Officeholder({ campaign, post }: { readonly campaign: Campaign; readonly post: HillPostReading }) {
  const face = post.holderId ? faceOf(campaign, post.holderId, post.name) : undefined;
  return <Card role="region" aria-labelledby="post-holder"><CardHeader><h2 id="post-holder" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="subjectPerson" size={18} /> Officeholder</h2></CardHeader><CardContent>
    <div className="ui-row-target grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
      <Portrait name={post.name} {...(face?.src ? { src: face.src } : {})} monogram={face?.monogram ?? "?"} size="lg" party={post.party} />
      <div className="grid min-w-0 gap-1">
        {post.holderId ? <Door href={place.person(post.holderId)} className="ui-row-link text-lg font-semibold text-foreground no-underline hover:no-underline">{post.name}</Door> : <strong className="text-lg">{post.name}</strong>}
        <span className="text-sm text-muted-foreground">{post.title}</span>
        <div className="flex flex-wrap items-center gap-2"><Tag tone="neutral"><PartyMark party={post.party} size={14} />{post.side}</Tag>{post.homeStateName ? <span className="text-xs text-muted-foreground">{post.homeStateName}</span> : null}</div>
      </div>
    </div>
  </CardContent></Card>;
}

function Position({ post }: { readonly post: HillPostReading }) {
  return <Card role="region" aria-labelledby="post-standing"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="post-standing" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="layerLean" size={18} /> Assessed position</h2><Tag tone="neutral" icon="review">Staff assessment</Tag></div></CardHeader><CardContent className="grid gap-3">
    <Gauge shape="meter" label="Toward you" value={post.standing.value} valueText={`${post.standing.percent}, ${post.standing.word.toLowerCase()}`} tone={toneOf(post.standing.stance)} marks={[{ at: 0.5, label: "Even" }]} />
    <p className="m-0 text-sm"><strong className="ui-valence-ink" data-valence={valenceOf(post.standing.stance)}>{post.standing.word}.</strong> {post.following}.</p>
    <p className="m-0 text-xs text-muted-foreground">Their standing influences the chamber they lead. An assessment is not a vote commitment.</p>
    {post.pending ? <p className="m-0 rounded-md bg-muted p-3 text-sm" role="status">{post.pending}</p> : null}
  </CardContent></Card>;
}

function Request({ post, context }: { readonly post: HillPostReading; readonly context?: PostContext }) {
  return <Card role="region" aria-labelledby="post-request"><CardHeader><h2 id="post-request" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="dossier" size={18} /> The request</h2></CardHeader><CardContent className="grid gap-3">
    <p className="m-0 text-sm leading-relaxed">{post.brief}</p>
    {context ? <Button asChild kind="secondary" className="h-auto justify-between whitespace-normal text-left"><Door href={place.bill(context.bill.id)}><span><span className="block text-xs text-muted-foreground">Bill in view</span><strong>{context.bill.title}</strong></span><Icon name="chevron" size={16} /></Door></Button> : <p className="m-0 text-xs text-muted-foreground">No bill or nomination is attached. This outreach concerns the member and the chamber they lead.</p>}
  </CardContent></Card>;
}

/** The person, their assessed position and the actual request stay beside the outreach choice. */
export function PostScreen({ campaign, post, context }: { readonly campaign: Campaign; readonly post: HillPostReading; readonly context?: PostContext }) {
  const acts = useHillCommit(campaign);
  return <Screen title={post.title} eyebrow={post.chamberName.replace(/^the /, "The ")} lede={<Button asChild kind="ghost" size="sm"><Door href="/washington/congress">Congress<Icon name="chevron" size={14} /></Door></Button>} screenClass="workspace" camera="us">
    <div className="grid min-w-0 gap-4 pb-6">
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2"><Officeholder campaign={campaign} post={post} /><Position post={post} /></div>
      <Request post={post} {...(context ? { context } : {})} />
      <Card role="region" aria-labelledby="post-lobby"><CardHeader><h2 id="post-lobby" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="summit" size={18} /> Legislative outreach</h2></CardHeader><CardContent><LobbyActs campaign={campaign} acts={acts} post={post.id} /></CardContent></Card>
      <Card role="region" aria-labelledby="post-history"><CardHeader><h2 id="post-history" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="record" size={18} /> Recorded approaches <Tag tone="neutral">{post.history.length}</Tag></h2></CardHeader><CardContent>
        <Collection items={post.history} initial={5} noun="approaches" className="ledger" empty="No approaches recorded for this member."
          render={(row) => <li key={row.id} className="grid min-w-0 gap-2 border-b border-border py-3 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{row.approach}</strong><Tag tone={row.landed ? "good" : "risk"} icon={row.landed ? "approve" : "adverse"}>{row.landed ? "Landed" : "Missed"}</Tag></div><span className="text-xs text-muted-foreground">{row.when}</span><p className="m-0 text-sm">{row.account}</p></li>} />
      </CardContent></Card>
    </div>
  </Screen>;
}
