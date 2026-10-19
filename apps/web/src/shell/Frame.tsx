import { Suspense, lazy, useCallback, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { AppFrame, Icon, TopBar, Wordmark, Sheet } from "@admin/ui-web";
import { useCampaignState, usePreferences } from "../app/hooks";
import { useDisplaySettings } from "../app/display";
import { freshChange, useLastChange } from "../app/last-change";
import { MapDataProvider } from "../map/data-context";
import { MapDirectiveProvider } from "../map/directive";
import { MapLayer } from "../map/MapLayer";
import type { MarkPoint } from "../map/marks/sources";
import { SheetSettledContext, useChromeInsets } from "./chrome-insets";
import { mapDestination } from "./map-routes";
import { useSearchShortcut } from "./search-shortcut";
import { ThemeControl } from "./ThemeControl";
import { PresidentialReviewProvider } from "../review/PresidentialReview";

import { TermStatus, TermActions, TermNav } from "./TermChrome";

const Search = lazy(async () => ({ default: (await import("./Search")).Search }));

/** Screens that stand outside a presidency, where the mode navigation would lead nowhere yet. */
const OUTSIDE_THE_TERM = new Set(["/", "/founding"]);

/**
 * Screens drawn before the device's stores have loaded. The title is the
 * first paint; it says the saves are opening until they have. Every other
 * screen acts on the stores and waits for them.
 */
const BEFORE_THE_STORES = new Set(["/"]);

function BarActions({ onSearch, inPlay }: { readonly onSearch: () => void; readonly inPlay: ReactNode }) {
  return (
    <>
      {inPlay}
      <button type="button" className="bar-button" onClick={onSearch} aria-label="Search" aria-keyshortcuts="Meta+K Control+K">
        <Icon name="review" size={20} />
        <span className="bar-button__word">Search</span>
      </button>
      <ThemeControl />
      <Link to="/settings" className="bar-button bar-button--settings" aria-label="Settings">
        <Icon name="utilitySettings" size={20} />
      </Link>
    </>
  );
}

/** Search loads the glossary, so it loads the first time it is opened and stays mounted after. */
function useSearch() {
  const [searching, setSearching] = useState(false);
  const [opened, setOpened] = useState(false);
  const open = useCallback(() => {
    setOpened(true);
    setSearching(true);
  }, []);
  const close = useCallback(() => setSearching(false), []);
  useSearchShortcut(open);
  const overlay = opened ? (
    <Suspense fallback={<Sheet open={searching} onClose={close} title="Search"><p role="status">Loading search…</p></Sheet>}>
      <Search open={searching} onClose={close} />
    </Suspense>
  ) : null;
  return { open, overlay };
}

/** A region chosen on the map goes to its screen when that screen exists; otherwise the map frames it itself. */
function useMapSelect(): (ref: string) => boolean {
  const router = useRouter();
  const navigate = useNavigate();
  const routes = useMemo(() => new Set(Object.keys(router.routesByPath)), [router]);
  return useCallback(
    (ref: string) => {
      const href = mapDestination(ref, routes);
      if (href) void navigate({ href });
      return href !== null;
    },
    [routes, navigate],
  );
}

/** A single pin chosen on the map opens its own screen, where the pin names one. */
function useMarkActivate(): (mark: MarkPoint) => void {
  const navigate = useNavigate();
  return useCallback(
    (mark: MarkPoint) => {
      if (mark.href) void navigate({ href: mark.href });
    },
    [navigate],
  );
}

/** The frame every screen sits in: the map behind, the bar above, the modes beside or below, search over all. */
export function Frame({ children }: { readonly children: ReactNode }) {
  const state = useCampaignState();
  // The store handle exists before restore settles; wait for its navigation and campaign state together.
  const ready = state.status !== "loading";
  const { preferences } = usePreferences();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const search = useSearch();
  const mapSettings = useDisplaySettings(preferences, state.status === "empty");
  const onSelect = useMapSelect();
  const onActivateMark = useMarkActivate();

  const campaign = state.status === "ready" ? state.campaign : undefined;
  const change = useLastChange();
  const baseline = campaign ? (freshChange(change, campaign)?.before ?? null) : null;
  const inTerm = campaign !== undefined && !OUTSIDE_THE_TERM.has(pathname);
  const { insets, settled } = useChromeInsets(inTerm ? "term" : "outside");
  const term = (node: ReactNode) => (inTerm ? node : null);

  return (
    <PresidentialReviewProvider>
    <MapDirectiveProvider>
      <SheetSettledContext.Provider value={settled}>
        <AppFrame
          map={
            // Every screen draws its own map in the page; the screen-wide layer is left only for the title's turning globe, so no other screen holds a second drawing context behind it.
            pathname === "/" ? (
              <MapDataProvider campaign={campaign ?? null} baseline={baseline}>
                <MapLayer insets={insets} settings={mapSettings} onSelect={onSelect} onActivateMark={onActivateMark} />
              </MapDataProvider>
            ) : null
          }
          bar={
            <TopBar
              home={
                <Link to={inTerm ? "/brief" : "/"} className="bar-home" aria-label={inTerm ? "Office of the President: the Brief" : "Office of the President: the title screen"}>
                  <Wordmark holder={campaign && inTerm ? `President ${campaign.founding.leader.name}` : undefined} />
                </Link>
              }
              status={campaign ? term(<TermStatus campaign={campaign} />) : undefined}
              actions={<BarActions onSearch={search.open} inPlay={campaign ? term(<TermActions campaign={campaign} />) : null} />}
            />
          }
          nav={campaign && inTerm ? term(<TermNav campaign={campaign} pathname={pathname} />) : undefined}
          overlays={search.overlay}
        >
          {ready || BEFORE_THE_STORES.has(pathname) ? children : <p className="stage-note" role="status">Opening this administration…</p>}
        </AppFrame>
      </SheetSettledContext.Provider>
    </MapDirectiveProvider>
    </PresidentialReviewProvider>
  );
}
