import { createFileRoute, redirect } from "@tanstack/react-router";
import { EmptyState, buttonClass } from "@admin/ui-web";
import { place } from "@admin/player-core";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";

function NoSuchReading() {
  return (
    <Screen title="No such reading" eyebrow="A reading" screenClass="workspace" camera="us">
      <EmptyState icon="emptyRecord" title="Reading unavailable"><p>This reading is not one the game keeps.</p><Door href={place.brief()} className={buttonClass("secondary")}>Back to the Brief</Door></EmptyState>
    </Screen>
  );
}

export const Route = createFileRoute("/brief/metric/$id")({
  // Every reading lives on the screen that owns it; old links and bookmarks land there, and only an id the game does not keep stays here.
  beforeLoad: ({ params }) => {
    const home = place.metric(params.id);
    if (!home.startsWith("/brief/metric/")) throw redirect({ href: home, replace: true });
  },
  component: NoSuchReading,
});
