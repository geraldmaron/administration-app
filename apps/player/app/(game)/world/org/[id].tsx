import { router, useLocalSearchParams } from "expo-router";
import { orgScreenReading } from "@admin/player-core";
import { InTerm } from "../../../../src/shell/InTerm";
import { NoSuchOrg, OrgScreen } from "../../../../src/world/sets/OrgScreen";
import { flatQuery, one, orgSearch } from "../../../../src/world/params";

export default function OrgRoute() {
  const query = useLocalSearchParams();
  const id = one(query, "id") ?? "";
  const { member } = orgSearch(flatQuery(query));
  return (
    <InTerm>
      {(campaign) => {
        const reading = orgScreenReading(campaign, id);
        return reading ? <OrgScreen key={id} reading={reading} {...(member ? { member } : {})} onMember={(next) => router.setParams({ member: next } as never)} /> : <NoSuchOrg />;
      }}
    </InTerm>
  );
}
