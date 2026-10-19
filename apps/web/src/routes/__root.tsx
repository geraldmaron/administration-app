import { Link, Outlet, createRootRoute, useLocation, useRouter } from "@tanstack/react-router";
import { Button, EmptyState, IconBadge, buttonClass } from "@admin/ui-web";
import { DeviceProviders } from "../app/DeviceProviders";
import { useCampaignState } from "../app/hooks";
import { Frame } from "../shell/Frame";
import { Screen } from "../shell/Screen";

/** An address that is not a screen. A stale person, bill or country on a real screen says so itself, in place; this is only for addresses the game never had. */
function NotFound() {
  const router = useRouter();
  const { pathname } = useLocation();
  const state = useCampaignState();
  const inTerm = state.status === "ready";
  return (
    <Screen title="This page doesn't exist" icon="folder" eyebrow="Page unavailable" screenClass="workspace" camera="world">
      <div className="not-found">
        <EmptyState icon="emptyInbox" title={`There is no screen at ${pathname}`}>
          The address may be mistyped, or it may be from an older version of the game. If you followed a link to a person, bill, country or Record entry, that item isn't in this administration. Try opening it from the screen that lists it.
        </EmptyState>
        <p className="stage-note">Search (Ctrl K or ⌘K) finds any screen, country or term.</p>
        <div className="not-found__actions">
          {inTerm ? (
            <Link to="/brief" className={buttonClass("primary")}>
              Back to the Brief
            </Link>
          ) : (
            <Link to="/" className={buttonClass("primary")}>
              Back to the start
            </Link>
          )}
          <Button kind="secondary" onClick={() => router.history.back()}>
            Go back
          </Button>
          {inTerm ? (
            <Link to="/" className={buttonClass("ghost")}>
              Title screen
            </Link>
          ) : null}
        </div>
      </div>
    </Screen>
  );
}

/** A broken map or provider must not be mounted again inside its own recovery screen. */
function ScreenFailure() {
  return (
    <main className="screen-failure">
      <header className="screen-head">
        <p className="screen-head__eyebrow">Office of the President · Recovery</p>
        <div className="screen-head__title-row">
          <IconBadge name="archive" tone="gold" size={48} />
          <h1 className="screen-head__title">The screen could not open</h1>
        </div>
      </header>
      <p>Try reloading this screen, or open the administrations saved on this device.</p>
      <div className="screen-failure__actions">
        <Button kind="primary" onClick={() => window.location.reload()}>Reload this screen</Button>
        <a className={buttonClass("ghost")} href="/administrations">Open saved administrations</a>
      </div>
      <p className="stage-note">Reloading restores the most recent saved state. A recent action may already have been saved. Check the Record before repeating it.</p>
    </main>
  );
}

export const Route = createRootRoute({
  component: () => (
    <DeviceProviders>
      <Frame>
        <Outlet />
      </Frame>
    </DeviceProviders>
  ),
  notFoundComponent: NotFound,
  errorComponent: ScreenFailure,
});
