import type { ReactNode } from "react";

export type AppFrameProps = {
  /** The map, drawn in the work canvas while a spatial screen is open. */
  readonly map: ReactNode;
  readonly bar: ReactNode;
  /** The main navigation; absent outside a presidency (the title, the founding). */
  readonly nav?: ReactNode;
  /** Search and other overlays, above the work. */
  readonly overlays?: ReactNode;
  readonly children: ReactNode;
};

/**
 * The player's layers, back to front: the map (shown only behind a spatial
 * screen), the navy masthead and navigation, the work surface, and the
 * overlays. On a phone the navigation is a bar under the work; from a tablet
 * up it is a drawer, a labeled rail, or the full list beside the work.
 */
export function AppFrame({ map, bar, nav, overlays, children }: AppFrameProps) {
  return (
    <div className="ui-frame" data-nav={nav ? "true" : "false"}>
      <a className="ui-frame__skip" href="#work">
        Skip to the work
      </a>
      <div className="ui-frame__map" data-surface="dark">
        {map}
      </div>
      <div className="ui-frame__bar">
        {bar}
      </div>
      {nav ? (
        <div className="ui-frame__nav">
          {nav}
        </div>
      ) : null}
      <main id="work" className="ui-frame__work" tabIndex={-1}>
        {children}
      </main>
      {overlays}
    </div>
  );
}
