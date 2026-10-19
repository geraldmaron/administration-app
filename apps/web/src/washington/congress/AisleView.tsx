import { useMemo, useState, type MouseEvent } from "react";
import type { Campaign, UsParty } from "@admin/engine";
import { chamberReach, memberDepth, type CongressChamber, type CongressSeat, type MemberDepth, type NextSenateClass } from "@admin/player-core";
import { Collection, HelpTip, PartyMark, Portrait, SortHeader, SortPicker, sortRows, useSort, type SortValue } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import type { AisleLens } from "./search";

const W = 1000;
const RIDGE_H = 150;
const GRID = 200;
/** How far one member's position spreads into the ridge, on the -1 to 1 scale. */
const BANDWIDTH = 0.045;
/** Half the width of the slice a click on a ridge selects, on the -1 to 1 scale. */
const SLICE = 0.08;
const PARTY_ORDER: readonly UsParty[] = ["democrat", "independent", "republican"];
/** Rows per page of the member list. */
const PAGE = 10;

const toX = (lean: number) => ((lean + 1) / 2) * W;
const toPct = (lean: number) => ((lean + 1) / 2) * 100;
const pct = (share: number) => `${Math.round(share * 100)}%`;

type Ridge = { readonly party: UsParty; readonly path: string; readonly count: number; readonly heights: readonly number[]; readonly median?: number };

/**
 * Each party's members as one ridge: a smoothed count of members at every
 * position, so the area under a ridge is the party's seats. Every ridge in a
 * chamber shares one vertical scale, so a bigger party stands taller.
 */
function ridges(chamber: CongressChamber): readonly Ridge[] {
  const grid = Array.from({ length: GRID + 1 }, (_, i) => -1 + (2 * i) / GRID);
  const kernel = (d: number) => Math.exp(-(d * d) / (2 * BANDWIDTH * BANDWIDTH));
  const curves = PARTY_ORDER.map((party) => {
    const leans = chamber.members.filter((member) => member.party === party && member.lean !== undefined && !member.vacant).map((member) => member.lean!);
    const sorted = [...leans].sort((a, b) => a - b);
    return { party, count: leans.length, median: sorted[Math.floor(sorted.length / 2)], heights: grid.map((g) => leans.reduce((sum, lean) => sum + kernel(g - lean), 0)) };
  }).filter((curve) => curve.count > 0);
  const top = Math.max(1e-9, ...curves.flatMap((curve) => curve.heights));
  return curves.map((curve) => {
    const points = curve.heights.map((h, i) => `${toX(grid[i]!).toFixed(1)},${(RIDGE_H - (h / top) * (RIDGE_H - 8)).toFixed(1)}`);
    return { party: curve.party, count: curve.count, heights: curve.heights, ...(curve.median !== undefined ? { median: curve.median } : {}), path: `M0,${RIDGE_H} L${points.join(" L")} L${W},${RIDGE_H} Z` };
  });
}

/** What the list below the ridges is showing. */
type Lens = AisleLens;

const PARTY_PLURAL: Readonly<Record<UsParty, string>> = { democrat: "Democrats", republican: "Republicans", independent: "Independents" };

type Shown = { readonly members: readonly CongressSeat[]; readonly title: string; readonly line: string; readonly from: number; readonly to: number };

export function lensMembers(chamber: CongressChamber, you: number, lens: Lens): Shown {
  const seated = chamber.members.filter((member) => member.lean !== undefined && !member.vacant);
  const ours = new Set(chamber.caucus.parties);
  const byDistance = (rows: readonly CongressSeat[]) => [...rows].sort((a, b) => Math.abs(a.lean! - you) - Math.abs(b.lean! - you) || a.seat.localeCompare(b.seat));
  const pick = (): Omit<Shown, "from" | "to"> => {
    switch (lens.kind) {
      case "slice":
        return { members: byDistance(seated.filter((member) => Math.abs(member.lean! - lens.at) <= SLICE)), title: "Members at this position", line: "Every seated member in this part of the economic-position scale, across all parties." };
      case "all":
        return { members: byDistance(seated), title: "All seated members", line: "The entire chamber, including members at both ends of the scale." };
      case "opponents":
        return { members: byDistance(seated).reverse(), title: "Farthest from your position", line: "The entire chamber, farthest from your economic position first. Distance is not a forecast of a vote or personal hostility." };
      case "holdouts":
        return { members: byDistance(seated.filter((member) => ours.has(member.party))).reverse(), title: "Your caucus, farthest from you", line: `Every member of the ${chamber.caucus.name}, farthest from your record first. Economic-position distance does not establish a vote commitment.` };
      case "near":
        return { members: byDistance(seated.filter((member) => Math.abs(member.lean! - you) <= SLICE * 1.5)), title: "Everyone near you", line: "Members of either caucus whose records sit close to yours, nearest first." };
      default:
        return { members: byDistance(seated.filter((member) => !ours.has(member.party))), title: "Nearest across the aisle", line: "Every member of the other caucus, nearest your record first. Proximity gives policy context; no vote commitment is inferred." };
    }
  };
  const shown = pick();
  const leans = shown.members.map((member) => member.lean!);
  return { ...shown, from: leans.length > 0 ? Math.min(...leans) : you, to: leans.length > 0 ? Math.max(...leans) : you };
}

/** Sparse tails remain selectable; density cannot decide whether a person is visible. */
function sliceAt(event: MouseEvent<SVGSVGElement>): Lens {
  const box = event.currentTarget.getBoundingClientRect();
  const share = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
  return { kind: "slice", at: share * 2 - 1 };
}

function DepthRow({ member, campaign, you, showUp }: { readonly member: MemberDepth; readonly campaign: Campaign; readonly you: number; readonly showUp: boolean }) {
  const face = member.personId ? faceOf(campaign, member.personId, member.name) : undefined;
  const side = member.fromYou === undefined ? "No record" : Math.abs(member.fromYou) < 0.03 ? "Level with you" : member.fromYou < 0 ? "Left of you" : "Right of you";
  return (
    <tr className={`hill-depth__row${member.href ? " ui-row-target" : ""}`} data-party={member.party}>
      <th scope="row" className="hill-depth__who" data-label="Member">
        <span className="hill-depth__person">
          <Portrait name={member.name} {...(face?.src ? { src: face.src } : {})} monogram={face?.monogram ?? "?"} size="sm" party={member.party} decorative />
          <span>
            {member.href ? <Door href={member.href} className="ui-row-link">{member.name}</Door> : member.name}
            <span className="hill-depth__where"><PartyMark party={member.party} size={11} /> {member.chamber === "house" ? member.seat : member.stateName}{member.post ? ` · ${member.post}` : ""}</span>
          </span>
        </span>
      </th>
      <td data-label="Position against yours">
        <span className="hill-depth__reading">
          {member.lean !== undefined ? (
            <span className="hill-position" aria-hidden="true">
              <span className="hill-position__track" />
              <span className="hill-position__you" style={{ insetInlineStart: `${toPct(you)}%` }} />
              <span className="hill-position__them" style={{ insetInlineStart: `${toPct(member.lean)}%` }} />
            </span>
          ) : <span />}
          <span className="hill-depth__value">{side}</span>
        </span>
      </td>
      <td data-label="Home state approves of you">
        {member.homeApproval === undefined ? <span className="hill-depth__unknown">No reading</span> : (
          <span className="hill-depth__reading" data-kind="share" data-high={member.homeApproval >= 0.5 ? "true" : undefined}>
            <span className="hill-depth__track"><span style={{ inlineSize: pct(member.homeApproval) }} /></span>
            <strong className="hill-depth__value">{pct(member.homeApproval)}</strong>
          </span>
        )}
      </td>
      <td data-label="Last recorded vote">
        {member.lastVote ? <strong data-vote={member.lastVote}>{member.lastVote === "yea" ? "Yea" : "Nay"}</strong> : <span className="hill-depth__unknown">None recorded</span>}
      </td>
      {showUp ? (
        <td data-label="Next election">
          {member.upNext ? <strong className="hill-depth__up">Up next</strong> : <span className="hill-depth__unknown">Not up</span>}
        </td>
      ) : null}
    </tr>
  );
}

type DepthKey = "name" | "position" | "approval" | "vote" | "up";

const DEPTH_VALUE: Readonly<Record<DepthKey, (row: MemberDepth) => SortValue>> = {
  name: (row) => row.name,
  position: (row) => (row.fromYou === undefined ? undefined : Math.abs(row.fromYou)),
  approval: (row) => row.homeApproval,
  vote: (row) => row.lastVote,
  up: (row) => (row.upNext ? 0 : 1),
};

/** The members of one lens as a sortable table, a page at a time; it opens in the lens's own order. */
function DepthTable({ rows, campaign, you, showUp, lensKey, farthestFirst, title }: { readonly rows: readonly MemberDepth[]; readonly campaign: Campaign; readonly you: number; readonly showUp: boolean; readonly lensKey: string; readonly farthestFirst: boolean; readonly title: string }) {
  const [sort, onSort, setSort] = useSort<DepthKey>({ key: "position", direction: farthestFirst ? "descending" : "ascending" }, lensKey);
  const sorted = useMemo(() => sortRows(rows, sort, DEPTH_VALUE, (a, b) => a.seat.localeCompare(b.seat)), [rows, sort]);
  const options = [
    { key: "position" as const, label: "Distance from you" },
    { key: "name" as const, label: "Name" },
    { key: "approval" as const, label: "Home state approval" },
    { key: "vote" as const, label: "Last recorded vote" },
    ...(showUp ? [{ key: "up" as const, label: "Next election" }] : []),
  ];
  return (
    <div className="hill-depth__table">
      <SortPicker options={options} sort={sort} onSort={setSort} />
      <table className="hill-depth__grid ui-table--stack" data-up={showUp ? "true" : undefined}>
        <caption className="ui-visually-hidden">{title}. Select a column heading to sort.</caption>
        <thead>
          <tr>
            <SortHeader label="Member" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Position against yours" sortKey="position" sort={sort} onSort={onSort} />
            <SortHeader label="Home state approves of you" sortKey="approval" sort={sort} onSort={onSort} first="descending" />
            <SortHeader label="Last recorded vote" sortKey="vote" sort={sort} onSort={onSort} first="descending" />
            {showUp ? <SortHeader label="Next election" sortKey="up" sort={sort} onSort={onSort} /> : null}
          </tr>
        </thead>
        <Collection as="tbody" columns={showUp ? 5 : 4} items={sorted} initial={PAGE} noun="members" resetKey={`${lensKey}:${sort.key}:${sort.direction}`}
          render={(member) => <DepthRow key={member.seat} member={member} campaign={campaign} you={you} showUp={showUp} />} />
      </table>
    </div>
  );
}

type ChamberProps = { readonly campaign: Campaign; readonly chamber: CongressChamber; readonly you: number; readonly senateClass?: NextSenateClass; readonly lens?: Lens; readonly onLens?: (lens: Lens) => void };

const PRESETS: readonly { readonly kind: "across" | "holdouts" | "near" | "all" | "opponents"; readonly label: string }[] = [
  { kind: "all", label: "All members" },
  { kind: "opponents", label: "Farthest from you" },
  { kind: "across", label: "Nearest across the aisle" },
  { kind: "holdouts", label: "Your caucus, farthest from you" },
  { kind: "near", label: "Everyone near you" },
];

/** One chamber as a landscape the President can work: the parties as ridges, the President as a pin, and the members in any part of it listed in depth. */
function AisleChamber({ campaign, chamber, you, senateClass, lens: externalLens, onLens }: ChamberProps) {
  const reach = chamberReach(chamber, you, 1);
  const shapes = useMemo(() => ridges(chamber), [chamber]);
  const [localLens, setLocalLens] = useState<Lens>(reach.need > 0 ? { kind: "across" } : { kind: "holdouts" });
  const lens = externalLens ?? localLens;
  const setLens = onLens ?? setLocalLens;
  const shown = useMemo(() => lensMembers(chamber, you, lens), [chamber, you, lens]);
  const rows = useMemo(() => shown.members.map((member) => memberDepth(campaign, member, you, senateClass, chamber.lastRoll)), [campaign, shown, you, senateClass, chamber.lastRoll]);
  const lensKey = lens.kind === "slice" ? `slice:${lens.at.toFixed(3)}` : lens.kind;
  const name = chamber.name.replace(/^the /, "");
  // Every House seat faces the voters every second November, so only the Senate's classes tell members apart.
  const showUp = chamber.chamber === "senate" && senateClass !== undefined;
  return (
    <section className="hill-aisle" aria-labelledby={`hill-aisle-${chamber.chamber}`}>
      <div className="hill-aisle__head">
        <h3 id={`hill-aisle-${chamber.chamber}`}>The {name}</h3>
        {reach.need > 0 ? (
          <p className="hill-aisle__need"><strong>{reach.need}</strong> <span>{reach.need === 1 ? "vote" : "votes"} from across the aisle to {reach.line.toLowerCase()}</span></p>
        ) : (
          <p className="hill-aisle__need" data-clear="true"><strong>0</strong> <span>Your caucus can {reach.line.toLowerCase()} alone if it holds together</span></p>
        )}
      </div>
      <div className="hill-aisle__stage">
        <svg className="hill-aisle__ridges" viewBox={`0 0 ${W} ${RIDGE_H + 2}`} preserveAspectRatio="none" role="img"
          aria-label={`The ${name}: ${shapes.map((shape) => `${shape.count} ${PARTY_PLURAL[shape.party]}`).join(", ")}, by recorded economic position. Your position is marked.`}
          onClick={(event) => setLens(sliceAt(event))}>
          {[...shapes].sort((a, b) => b.count - a.count).map((shape) => <path key={shape.party} className="hill-aisle__ridge" data-party={shape.party} d={shape.path} />)}
          {shown.members.length > 0 ? <rect className="hill-aisle__band" x={toX(shown.from) - 6} width={Math.max(12, toX(shown.to) - toX(shown.from) + 12)} y={2} height={RIDGE_H - 2} /> : null}
          <line className="hill-aisle__axis" x1={0} x2={W} y1={RIDGE_H} y2={RIDGE_H} />
        </svg>
        {shapes.map((shape) => shape.median !== undefined ? (
          <span key={shape.party} className="hill-aisle__median" data-party={shape.party} style={{ insetInlineStart: `${toPct(shape.median)}%` }}>
            <PartyMark party={shape.party} size={16} />
            <span>{shape.count}</span>
          </span>
        ) : null)}
        <span className="hill-aisle__you" style={{ insetInlineStart: `${toPct(you)}%` }}><span>You</span></span>
      </div>
      <div className="hill-aisle__scale" aria-hidden="true"><span>Left</span><span>Center</span><span>Right</span></div>
      <label className="hill-aisle__range">
        <span>Select any position, including the outer fringes</span>
        <input type="range" min={-1} max={1} step={0.01} value={lens.kind === "slice" ? lens.at : you} aria-label={`Position in the ${name}`} aria-valuetext={lens.kind === "slice" ? `${Math.round(lens.at * 100)}, from left −100 to right 100` : "Your position"} onChange={(event) => setLens({ kind: "slice", at: Number(event.target.value) })} />
      </label>
      <div className="hill-depth">
        <div className="hill-switch hill-depth__lenses" role="group" aria-label={`Members of the ${name} to list`}>
          {PRESETS.map((preset) => (
            <button key={preset.kind} type="button" aria-pressed={lens.kind === preset.kind} onClick={() => setLens({ kind: preset.kind })}>{preset.label}</button>
          ))}
          {lens.kind === "slice" ? <button type="button" aria-pressed="true">Your selection</button> : null}
        </div>
        <p className="hill-depth__line" aria-live="polite"><strong>{shown.title}</strong>, {rows.length} {rows.length === 1 ? "member" : "members"} (shaded on the scale). {shown.line} Press any ridge to list the members at that point.</p>
        {rows.length === 0 ? <p className="hill-note">No member sits in that part of the scale.</p> : (
          <DepthTable rows={rows} campaign={campaign} you={you} showUp={showUp} lensKey={lensKey} farthestFirst={lens.kind === "holdouts" || lens.kind === "opponents"} title={shown.title} />
        )}
      </div>
    </section>
  );
}

/** Where each chamber sits, where the President does, and any part of it listed member by member. */
export function WhereYouStand({ campaign, chambers, you, senateClass, lenses, onLens }: { readonly campaign: Campaign; readonly chambers: readonly CongressChamber[]; readonly you: number; readonly senateClass?: NextSenateClass; readonly lenses?: { readonly house?: Lens; readonly senate?: Lens }; readonly onLens?: (chamber: "house" | "senate", lens: Lens) => void }) {
  return (
    <section className="hill-card" aria-labelledby="hill-stand-title">
      <div className="hill-card__title">
        <h2 id="hill-stand-title">Where you stand with them</h2>
        <HelpTip label="About the ridges">
          Each ridge shows a party&rsquo;s members spread by the economic position on their public record, left to right. A taller ridge means more members at that position. The gold pin is your own position. The list beneath shows the members in the shaded part of the scale. For each, it gives where they sit against you, how their home state rates you, how they voted in the chamber&rsquo;s last recorded vote, and whether they face the voters next. Press a ridge to look at another part of the chamber. A position is not a promise of a vote.
        </HelpTip>
      </div>
      {chambers.map((chamber) => <AisleChamber key={chamber.chamber} campaign={campaign} chamber={chamber} you={you} lens={lenses?.[chamber.chamber]} onLens={onLens ? (next) => onLens(chamber.chamber, next) : undefined} {...(senateClass ? { senateClass } : {})} />)}
    </section>
  );
}
