import type { ReactNode } from "react";
import type { Campaign } from "@admin/engine";
import { useWindowDimensions } from "react-native";
import { Button, Row } from "@admin/ui";
import { DraftsControl } from "./Drafts";
import { InboxButton } from "./InboxButton";
import { go } from "./navigate";
import { SearchButton } from "./Search";

/** The situation bar's controls: the calendar, search, the drafts waiting to be signed, the inbox and the one control that spends time. */
export function BarActions({ campaign, continueControl }: { readonly campaign: Campaign; readonly continueControl: ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <Row gap="xs">
      {width < 360 ? null : <Button kind="quiet" size="compact" icon="schedule" label="Calendar" onPress={() => go("/calendar")} />}
      <SearchButton campaign={campaign} />
      <DraftsControl campaign={campaign} />
      <InboxButton campaign={campaign} />
      {continueControl}
    </Row>
  );
}
