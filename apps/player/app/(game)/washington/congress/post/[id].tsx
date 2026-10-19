import { useLocalSearchParams } from "expo-router";
import { billAndAct, hillPostReading } from "@admin/player-core";
import { Missing } from "../../../../../src/congress/Missing";
import { PostScreen } from "../../../../../src/congress/PostScreen";
import { InTerm } from "../../../../../src/shell/InTerm";

export default function PostRoute() {
  const { id, bill } = useLocalSearchParams<{ id: string; bill?: string }>();
  return (
    <InTerm>
      {(campaign) => {
        const post = typeof id === "string" ? hillPostReading(campaign, id) : undefined;
        const found = typeof bill === "string" && bill ? billAndAct(campaign, bill) : undefined;
        return post ? <PostScreen key={id} campaign={campaign} post={post} {...(found ? { bill: found.bill } : {})} /> : <Missing eyebrow="Congress" title="Post not found" line="We couldn't find this post. No one in Congress holds it right now." back="/washington/congress" backLabel="Congress" />;
      }}
    </InTerm>
  );
}
