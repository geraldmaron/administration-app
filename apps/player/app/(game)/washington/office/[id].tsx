import { useLocalSearchParams, useRouter } from "expo-router";
import { OfficeScreen } from "../../../../src/executive/OfficeScreen";
import { fillOf, officeViewOf } from "../../../../src/executive/office-view";
import { InTerm } from "../../../../src/shell/InTerm";

/** One office's file. The view and the chair being filled live in the address, so Back returns to them. */
export default function OfficePage() {
  const params = useLocalSearchParams<{ id: string; view?: string; fill?: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const view = officeViewOf(params.view);
  const fill = fillOf(params.fill);
  return (
    <InTerm>
      {(campaign) => (
        <OfficeScreen
          key={id}
          campaign={campaign}
          id={id}
          view={view}
          onView={(next) => router.setParams({ view: next === "overview" ? undefined : next })}
          fill={fill}
          onFill={(next) => (next ? router.push({ pathname: "/washington/office/[id]", params: { id, ...(params.view ? { view: params.view } : {}), fill: next } } as never) : router.setParams({ fill: undefined }))}
        />
      )}
    </InTerm>
  );
}
