import { MapView } from "../map/MapView";
import { homesLensId } from "../map/lenses/home-lens";

type HomeMapProps = {
  readonly title: string;
  readonly you?: string | undefined;
  readonly mate?: string | undefined;
  readonly bench?: readonly string[];
  readonly note: string;
  /** Given, a state chosen on the map becomes the choice; the draft lives only on this screen, so without it the map is a reading only. */
  readonly onChoose?: (state: string) => void;
};

/**
 * Where the ticket is from, on the game's map. A state chosen on it never
 * leaves the founding screen for a state page: the draft lives only here.
 */
export function HomeMap({ title, you, mate, bench, note, onChoose }: HomeMapProps) {
  const lifted = [you, mate].filter((id): id is string => Boolean(id)).map((id) => `state:${id}`);
  return (
    <div className="home-map" inert={onChoose ? undefined : true}>
      <MapView title={title} lens={homesLensId(you, mate, bench)} camera="us" {...(lifted.length > 0 ? { selection: lifted.join("|") } : {})} height={300} note={note} {...(onChoose ? { onChoose: (ref: string) => ref.startsWith("state:") && onChoose(ref.slice("state:".length)) } : {})} />
    </div>
  );
}
