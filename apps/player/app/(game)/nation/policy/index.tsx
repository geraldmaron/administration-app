import { useLocalSearchParams } from "expo-router";
import { paramOf, setSearchParams } from "../../../../src/nation/params";
import { PolicyScreen, isPolicyDomain, isPolicyView } from "../../../../src/nation/policy/PolicyScreen";
import { InNation } from "../../../../src/nation/NationTrail";
import { InTerm } from "../../../../src/shell/InTerm";

const SCOPES = ["issued", "catalogue"] as const;
const STATUSES = ["desk", "shut", "rulemaking", "court", "standing", "undone"];

export default function PolicyRoute() {
  const params = useLocalSearchParams<{ domain?: string; view?: string; orderScope?: string; orderStatus?: string; orderQuery?: string }>();
  const domain = paramOf(params.domain);
  const view = paramOf(params.view);
  const scope = SCOPES.find((entry) => entry === paramOf(params.orderScope));
  const status = STATUSES.find((entry) => entry === paramOf(params.orderStatus));
  const query = paramOf(params.orderQuery)?.slice(0, 200);
  return (
    <InTerm>
      {(campaign) => (
        <InNation room="policy">
        <PolicyScreen
          campaign={campaign}
          domain={isPolicyDomain(domain) ? domain : "fiscal"}
          view={isPolicyView(view) ? view : "proposals"}
          onView={(next) => setSearchParams({ view: next === "proposals" ? undefined : next })}
          onDomain={(next) => setSearchParams({ domain: next })}
          orderSearch={{ ...(scope ? { orderScope: scope } : {}), ...(status ? { orderStatus: status } : {}), ...(query ? { orderQuery: query } : {}) }}
          onOrderSearch={(next) => setSearchParams({ orderScope: next.orderScope, orderStatus: next.orderStatus, orderQuery: next.orderQuery })}
        />
        </InNation>
      )}
    </InTerm>
  );
}
