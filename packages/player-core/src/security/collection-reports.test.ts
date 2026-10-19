import { describe, expect, it } from "vitest";
import { apply, closeTasking, intelligencePhase, selectCollectionProducts, taskCollection, createSave, loadSave,
  hasIntelOnNation, hasIntelOnRelationship, shareCollectionReport } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { boardPanelsReading } from "../world/board-panels";
import { nationFile } from "../world/nation-file";
import { nationPosture } from "../world/nation-posture";
import { unreadTiesOf } from "../world/third-party-standing";
import { worldOverview } from "../world/world-board";
import { collectionRecipients, collectionReports, shareReportChoices } from "./collection-reports";

describe("issued intelligence on the player's desk", () => {
  it("keeps the issued report and its gaps after closing and restoring the campaign", () => {
    let campaign = openingCampaign({ seedText: "report-reading" });
    const tasked = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation", target: "RUS", question: "What is known about security conditions?" });
    if (!tasked.ok) throw new Error(tasked.reason);
    campaign = apply(campaign, tasked.packet);
    for (const packet of intelligencePhase(campaign)) campaign = apply(campaign, packet);
    const issued = collectionReports(campaign);
    expect(issued).toHaveLength(1);
    expect(issued[0]?.target).toBe("Russia");
    expect(issued[0]?.gaps.length).toBeGreaterThan(0);
    const product = selectCollectionProducts(campaign)[0]!;
    const closed = closeTasking(campaign, product.tasking);
    if (!closed.ok) throw new Error(closed.reason);
    campaign = loadSave(createSave(apply(campaign, closed.packet)));
    expect(collectionReports(campaign)).toEqual(issued);
    expect(shareReportChoices(campaign, product.id, undefined).columns[0]?.locked).toContain("Choose a government to share it with");
  });

  it("does not turn an ally disclosure into general access or change public world rankings", () => {
    let campaign = openingCampaign({ seedText: "report-privacy" });
    const tasked = taskCollection(campaign, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation",
      target: "RUS", question: "What is known about security conditions?", focus: "external-intent" });
    if (!tasked.ok) throw new Error(tasked.reason);
    campaign = apply(campaign, tasked.packet);
    for (const packet of intelligencePhase(campaign)) campaign = apply(campaign, packet);
    const report = selectCollectionProducts(campaign)[0]!;
    const recipient = collectionRecipients(campaign, report.id).find((entry) => !entry.reason)?.id;
    if (!recipient) throw new Error("No trusted recipient for the report");
    const nations = Object.keys(campaign.nations) as NationId[];
    const access = () => nations.map((nation) => [nation, hasIntelOnNation(campaign, nation)]);
    const beforeAccess = access();
    const beforeRelationships = Object.values(campaign.relationships).map((relationship) =>
      [relationship.from, relationship.to, hasIntelOnRelationship(campaign, relationship)]);
    const beforePanels = boardPanelsReading(campaign);
    const beforeOverview = worldOverview(campaign);
    const beforeFile = nationFile(campaign, "RUS" as NationId);
    const beforePosture = nationPosture(campaign, "RUS" as NationId);
    const beforeUnreadTies = unreadTiesOf(campaign, recipient);
    const sent = shareCollectionReport(campaign, report.id, [recipient]);
    if (!sent.ok) throw new Error(sent.reason);
    const shared = apply(campaign, sent.packet);
    expect(nations.map((nation) => [nation, hasIntelOnNation(shared, nation)])).toEqual(beforeAccess);
    expect(Object.values(shared.relationships).map((relationship) =>
      [relationship.from, relationship.to, hasIntelOnRelationship(shared, relationship)])).toEqual(beforeRelationships);
    expect(boardPanelsReading(shared)).toEqual(beforePanels);
    expect(worldOverview(shared)).toEqual(beforeOverview);
    expect(nationFile(shared, "RUS" as NationId)).toEqual(beforeFile);
    expect(nationPosture(shared, "RUS" as NationId)).toEqual(beforePosture);
    expect(unreadTiesOf(shared, recipient)).toEqual(beforeUnreadTies);
    expect(collectionReports(shared)[0]?.shared).toHaveLength(1);
  });
});
