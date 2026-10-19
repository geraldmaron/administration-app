import { apply, taskCollection, selectCollectionProducts, PUBLIC_STATE_QUESTION } from "../../packages/engine/dist/index.js";
import { draftCollectionProduct } from "../../packages/engine/dist/collection-report.js";
import { foundFixture, advanceWeeks } from "./_campaign.mjs";

export const name = "collection-intelligence";

export function build() {
  let campaign = foundFixture({ seedText: "collection-intelligence", leaderName: "Morgan Avery" });
  const tasks = [
    { element: "IC-CIA", discipline: "humint", target: "RUS", focus: "overview", note: "Compare this with the current diplomatic brief." },
    { element: "IC-NSA", discipline: "sigint", target: "IRN" },
    { element: "IC-NGA", discipline: "geoint", target: "CHN" },
  ];
  for (const task of tasks) {
    const result = taskCollection(campaign, { ...task, targetKind: "foreign-nation", question: "Assess security conditions and gaps in our reporting." });
    if (!result.ok) throw new Error(result.reason);
    campaign = apply(campaign, result.packet);
  }
  const minnesota = campaign.states.MN;
  campaign = { ...campaign, states: { ...campaign.states, MN: { ...minnesota, claims: [...minnesota.claims, { signature: "relief:unrest", openedTurn: campaign.turn, expiresTurn: campaign.turn + 5, weight: 0.5, reason: "Minnesota's governor requested federal help with the unrest." }] } } };
  const domestic = taskCollection(campaign, { element: "IC-DHS", discipline: "osint", targetKind: "domestic-state", target: "MN", question: PUBLIC_STATE_QUESTION });
  if (!domestic.ok) throw new Error(domestic.reason);
  campaign = advanceWeeks(apply(campaign, domestic.packet), 1);
  if (!selectCollectionProducts(campaign).some((report) => report.status === "findings" && report.targetKind === "foreign-nation")) throw new Error("The fixture needs a foreign report to exercise sharing.");
  // The real result writer can file several findings for an all-source task.
  // Keep a dated three-fact product so the browser can disclose one fact now
  // and another later, with the original issued report still in the archive.
  const original = selectCollectionProducts(campaign).find((report) => report.target === "RUS" && report.status === "findings");
  if (!original) throw new Error("The fixture needs its Russia report.");
  const tasking = campaign.security.intelligence.taskings[original.tasking];
  const allSource = { ...tasking, discipline: "all-source" };
  const filed = draftCollectionProduct({ ...campaign, calendar: original.date }, allSource, original.day, 0.9);
  if (filed.findings?.length < 3) throw new Error("The fixture needs three sourced findings for selective sharing.");
  campaign = { ...campaign, security: { ...campaign.security, intelligence: {
    ...campaign.security.intelligence,
    taskings: { ...campaign.security.intelligence.taskings, [tasking.id]: allSource },
    products: { ...campaign.security.intelligence.products, [tasking.id]: filed },
    archive: (campaign.security.intelligence.archive ?? []).map((report) => report.id === original.id ? filed : report),
  } } };
  return campaign;
}
