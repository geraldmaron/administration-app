import { createFileRoute } from "@tanstack/react-router";
import type { Campaign } from "@admin/engine";
import { billAndAct, hillPostReading } from "@admin/player-core";
import { EmptyState } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { InTerm } from "../shell/InTerm";
import { Screen } from "../shell/Screen";
import { PostScreen } from "../washington/congress/PostScreen";

function Post({ campaign, id, bill }: { readonly campaign: Campaign; readonly id: string; readonly bill?: string }) {
  const post = hillPostReading(campaign, id);
  const found = bill ? billAndAct(campaign, bill) : undefined;
  if (post) return <PostScreen campaign={campaign} post={post} {...(found ? { context: { bill: found.bill } } : {})} />;
  return (
    <Screen title="No such post" eyebrow="Congress" screenClass="workspace" camera="us">
      <EmptyState icon="emptyRecord" title="Nobody holds this post in Congress">
        <Door href="/washington/congress">Back to Congress</Door>
      </EmptyState>
    </Screen>
  );
}

function PostPage() {
  const { id } = Route.useParams();
  const { bill } = Route.useSearch();
  return <InTerm>{(campaign) => <Post key={id} campaign={campaign} id={id} {...(bill ? { bill } : {})} />}</InTerm>;
}

export const Route = createFileRoute("/washington/congress/post/$id")({
  validateSearch: (search: Record<string, unknown>): { readonly bill?: string } => (typeof search["bill"] === "string" && search["bill"] ? { bill: search["bill"] } : {}),
  component: PostPage,
});
