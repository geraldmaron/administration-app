import { memo } from "react";
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import { COUNTRY_PATHS, GRATICULE_PATHS, MAP_VIEWBOX, SPHERE_PATH, projectToPlate } from "@admin/world/maps";
import { useInk } from "@admin/ui";

/** Washington, and capitals the President's week reaches, by longitude and latitude. */
const WASHINGTON = { lon: -77.04, lat: 38.9 } as const;
const CAPITALS: readonly (readonly [number, number])[] = [
  [-0.13, 51.51], // London
  [4.35, 50.85], // Brussels
  [37.62, 55.75], // Moscow
  [116.4, 39.9], // Beijing
  [139.69, 35.69], // Tokyo
  [77.21, 28.61], // New Delhi
  [-47.88, -15.79], // Brasília
  [36.82, -1.29], // Nairobi
  [149.13, -35.28], // Canberra
  [35.21, 31.77], // Jerusalem
  [-99.13, 19.43], // Mexico City
  [-75.7, 45.42], // Ottawa
];

/** A great-circle stand-in: a quadratic arc lifted toward the pole in proportion to its length, so routes read as routes. */
function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const lift = Math.hypot(to.x - from.x, to.y - from.y) * 0.28;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${mx.toFixed(1)} ${(my - lift).toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

type Ring = { readonly points: readonly (readonly [number, number])[] };

const OPEN = 20;

function ringsOf(d: string): Ring[] {
  return d
    .split("M")
    .slice(1)
    .map((ring) => {
      const n = ring.replace(/[LZ]/g, " ").trim().split(/\s+/).map(Number);
      const points: (readonly [number, number])[] = [];
      for (let i = 0; i + 1 < n.length; i += 2) points.push([n[i]!, n[i + 1]!]);
      return { points };
    })
    .filter((ring) => ring.points.length > 1);
}

const gap = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Rejoins rings the geometry bake split where an outline crosses the
 * antimeridian: such a ring closes with a long jump back to its start, and
 * drawn as stored it rules a wedge across the map. Each open ring is chained
 * to the open ring whose start lies nearest its end until they close.
 */
function rejoined(d: string): string {
  const rings = ringsOf(d);
  const closed = rings.filter((ring) => gap(ring.points[0]!, ring.points.at(-1)!) <= OPEN);
  const open = rings.filter((ring) => gap(ring.points[0]!, ring.points.at(-1)!) > OPEN);
  const merged: Ring[] = [];
  while (open.length > 0) {
    let chain = [...open.shift()!.points];
    for (let next = nearest(open, chain.at(-1)!); next >= 0; next = nearest(open, chain.at(-1)!)) chain = [...chain, ...open.splice(next, 1)[0]!.points];
    merged.push({ points: chain });
  }
  return [...closed, ...merged].map((ring) => `M ${ring.points.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`).join(" ");
}

function nearest(open: readonly Ring[], end: readonly [number, number]): number {
  let best = -1;
  for (let i = 0; i < open.length; i++) if (gap(open[i]!.points[0]!, end) < 40 && (best < 0 || gap(open[i]!.points[0]!, end) < gap(open[best]!.points[0]!, end))) best = i;
  return best;
}

const ORIGIN = projectToPlate(WASHINGTON.lon, WASHINGTON.lat);
const ARCS = CAPITALS.map(([lon, lat]) => ({ end: projectToPlate(lon, lat), d: arcPath(ORIGIN, projectToPlate(lon, lat)) }));
const OTHERS = Object.entries(COUNTRY_PATHS)
  .filter(([code]) => code !== "USA")
  .map(([code, d]) => [code, rejoined(d)] as const);
const USA = COUNTRY_PATHS.USA ? rejoined(COUNTRY_PATHS.USA) : undefined;

/**
 * The title's world: every government drawn from the game's own projected
 * outlines, the United States in the gold of the office (framed on the
 * Americas where the screen is too narrow for the whole world), and the routes a
 * President's week runs to other capitals. Static and complete at rest, so
 * it reads the same under reduced motion and in a thumbnail.
 */
export const WorldPlate = memo(function WorldPlate({ focus = "world" }: { readonly focus?: "world" | "americas" }) {
  const sea = useInk("surface");
  const deep = useInk("backgroundStrong");
  const land = useInk("surfaceRaised");
  const border = useInk("borderColorStrong");
  const grid = useInk("borderColor");
  const gold = useInk("gold");
  const goldDeep = useInk("goldRule");
  const route = useInk("accent");
  return (
    <Svg width="100%" height="100%" viewBox={focus === "americas" ? `${ORIGIN.x - 230} 20 330 480` : `0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Defs>
        <RadialGradient id="sea" cx="38%" cy="42%" r="70%">
          <Stop offset="0" stopColor={sea} stopOpacity={1} />
          <Stop offset="1" stopColor={deep} stopOpacity={1} />
        </RadialGradient>
        <LinearGradient id="usa" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gold} stopOpacity={0.95} />
          <Stop offset="1" stopColor={goldDeep} stopOpacity={0.95} />
        </LinearGradient>
        <LinearGradient id="route" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={gold} stopOpacity={0.9} />
          <Stop offset="1" stopColor={route} stopOpacity={0.35} />
        </LinearGradient>
      </Defs>
      <Path d={SPHERE_PATH} fill="url(#sea)" />
      <G stroke={grid} strokeWidth={0.4} strokeOpacity={0.55} fill="none">
        {GRATICULE_PATHS.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
      <G fill={land} fillOpacity={0.92} stroke={border} strokeWidth={0.35} strokeOpacity={0.7}>
        {OTHERS.map(([code, d]) => (
          <Path key={code} d={d} />
        ))}
      </G>
      {USA ? (
        <G>
          <Path d={USA} fill="none" stroke={gold} strokeWidth={3} strokeOpacity={0.18} />
          <Path d={USA} fill="url(#usa)" stroke={gold} strokeWidth={0.6} />
        </G>
      ) : null}
      <G fill="none" stroke="url(#route)" strokeWidth={0.9} strokeLinecap="round">
        {ARCS.map((arc, i) => (
          <Path key={i} d={arc.d} strokeDasharray="2 2.5" />
        ))}
      </G>
      {ARCS.map((arc, i) => (
        <Circle key={i} cx={arc.end.x} cy={arc.end.y} r={1.6} fill={route} fillOpacity={0.9} />
      ))}
      <Circle cx={ORIGIN.x} cy={ORIGIN.y} r={6} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.7} />
      <Circle cx={ORIGIN.x} cy={ORIGIN.y} r={2.4} fill={gold} />
    </Svg>
  );
});
