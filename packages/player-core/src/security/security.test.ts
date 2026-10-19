import { beforeAll, describe, expect, it } from "vitest";
import { POSTURE_READINESS_COST, apply, taskCollection, type Campaign, type Commitment } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { commissionChoices, commissionOrder, pressChoices, pressOrder } from "./assessment-reading";
import { closeTaskingChoices, closeTaskingOrder, collectionReading, taskChoices, taskOrder, taskingRefusal } from "./collection-reading";
import { amendChoices, amendOrder, postureChoices, postureOrder, reassignChoices, reassignOrder, reliefChoices, reliefOrder } from "./command-acts";
import { commandCamera, commandCards, commandFile, commandSelection } from "./command-board";
import { commitmentChoices, commitmentOrder, commitmentsReading } from "./commitment-reading";
import { closeFindingChoices, closeFindingOrder, counselRefusal, covertReading, findingTargets, signChoices, signOrder } from "./covert-reading";
import { securityBoard } from "./security-board";

let opening: Campaign;
let US: NationId;

function deployment(id: string, target: string): Commitment {
  return {
    id,
    kind: "deployment",
    actor: US,
    target: { kind: "nation", id: target },
    resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 40 },
    source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count: 2 },
    startedTurn: 0,
    review: "standing",
    status: "active",
    rationale: "test",
  };
}

const withCommitment = (campaign: Campaign, commitment: Commitment): Campaign => ({ ...campaign, commitments: { ...campaign.commitments, [commitment.id]: commitment } });

beforeAll(() => {
  opening = openingCampaign({ seedText: "security-desk" });
  US = opening.founding.nation;
}, 60_000);

describe("command board", () => {
  it("lists the eleven commands, the geographic ones with an area to frame and light", () => {
    const cards = commandCards(opening);
    expect(cards).toHaveLength(11);
    expect(cards.filter((card) => card.hasArea)).toHaveLength(6);
    expect(commandCamera(opening, "CCMD-EUCOM")).toMatch(/^set:nation:/);
    expect(commandSelection(opening, "CCMD-EUCOM")).toMatch(/nation:/);
    expect(commandCamera(opening, "CCMD-CYBERCOM")).toBe("world");
    expect(commandSelection(opening, "CCMD-CYBERCOM")).toBeUndefined();
  });

  it("files forces by zone and base from the placement, never as a head count", () => {
    const placed = withCommitment(opening, deployment("commitment:deployment:test:POL:1", "POL"));
    const file = commandFile(placed, "CCMD-EUCOM")!;
    const row = file.zones.flatMap((zone) => zone.rows).find((entry) => entry.id === "commitment:deployment:test:POL:1");
    expect(row).toBeDefined();
    expect(row!.precision).toBe("zone");
    expect(commandFile(opening, "CCMD-NOPE")).toBeUndefined();
  });
});

describe("command acts", () => {
  it("prices a posture at the weekly readiness the commands phase charges, and offers the others", () => {
    const table = postureChoices(opening, "CCMD-INDOPACOM")!;
    expect(table.columns.map((column) => column.id)).toEqual(["heightened", "surge"]);
    const bill = table.rows.find((row) => row.id === "bill")!;
    expect(bill.cells[1]!.text).toContain(`${POSTURE_READINESS_COST.surge * 100}`);
    const after = apply(opening, postureOrder(opening, "CCMD-INDOPACOM", "surge"));
    expect(after.security.unifiedCommand.commands["CCMD-INDOPACOM"]!.posture).toBe("surge");
  });

  it("refuses a relief with no reason and prices the chain after it", () => {
    expect(reliefChoices(opening, "CCMD-CENTCOM", "")!.columns[0]!.locked).toMatch(/reason/);
    const table = reliefChoices(opening, "CCMD-CENTCOM", "Lost confidence")!;
    expect(table.columns[0]!.locked).toBeUndefined();
    const chain = table.rows.find((row) => row.id === "chain")!;
    expect(chain.cells[0]!.text).toMatch(/^\d+% carried out, from \d+%$/);
    const after = apply(opening, reliefOrder(opening, "CCMD-CENTCOM", "Lost confidence"));
    expect(after.security.unifiedCommand.commands["CCMD-CENTCOM"]!.commander?.acting).toBe(true);
    expect(() => reliefOrder(opening, "CCMD-CENTCOM", " ")).toThrow();
  });

  it("moves a share between commands and a country between maps, each read off the packet it commits", () => {
    const table = reassignChoices(opening, "CCMD-INDOPACOM", "CCMD-CENTCOM", "navy", 0.1);
    expect(table.rows.find((row) => row.id === "from")!.cells[0]!.text).toBe("30%, from 40%");
    const moved = apply(opening, reassignOrder(opening, "CCMD-INDOPACOM", "CCMD-CENTCOM", "navy", 0.1));
    expect(moved.security.unifiedCommand.commands["CCMD-CENTCOM"]!.assignment.navy).toBeCloseTo(0.22, 5);
    const amend = amendChoices(opening, "JPN" as NationId, "CCMD-NORTHCOM", "");
    expect(amend.columns[0]!.locked).toMatch(/reason/);
    const amended = apply(opening, amendOrder(opening, "JPN" as NationId, "CCMD-NORTHCOM", "Homeland defense now covers the northern Pacific"));
    expect(commandSelection(amended, "CCMD-NORTHCOM")).toContain("nation:JPN");
  });
});

describe("covert findings", () => {
  it("compares the three notice tiers, and prices withholding as the Hill reads it", () => {
    const target = findingTargets(opening).find((entry) => entry.id !== ("CAN" as NationId))!.id;
    const draft = { target, objective: "Disrupt a weapons shipment bound for an armed group", state: "written" as const, reasons: "" };
    const table = signChoices(opening, draft);
    expect(table.columns.map((column) => column.id)).toEqual(["full-committees", "gang-of-eight", "withheld"]);
    expect(table.columns.find((column) => column.id === "withheld")!.locked).toMatch(/reasons/);
    const withReasons = signChoices(opening, { ...draft, reasons: "A leak would end it." });
    const hill = withReasons.rows.find((row) => row.id === "hill")!;
    expect(hill.cells[2]!.text).toMatch(/How Congress feels about you/);
    expect(hill.cells[0]!.text).toBe("Nothing");
    const signed = apply(opening, signOrder(opening, { ...draft, reasons: "A leak would end it." }, "withheld"));
    expect(covertReading(signed).open).toHaveLength(1);
    expect(covertReading(signed).open[0]!.owesNotice).toBe(true);
    const close = closeFindingChoices(signed, covertReading(signed).open[0]!.id)!;
    expect(close.columns).toHaveLength(1);
    expect(covertReading(apply(signed, closeFindingOrder(signed, covertReading(signed).open[0]!.id))).closed).toHaveLength(1);
  });

  it("says counsel will not paper an objective aimed at American politics, and still lets the attempt be recorded", () => {
    const target = findingTargets(opening)[0]!.id;
    const draft = { target, objective: "Shape public opinion before the election", state: "written" as const, reasons: "" };
    expect(counselRefusal(opening, draft)).toMatch(/public opinion/);
    const table = signChoices(opening, draft);
    expect(table.rows.find((row) => row.id === "counsel")!.cells[0]!.tone).toBe("adverse");
    expect(covertReading(apply(opening, signOrder(opening, draft, "full-committees"))).open).toHaveLength(0);
  });
});

describe("collection and assessments", () => {
  it("shows a declined tasking as the community's refusal, and a lawful one as a standing tasking that can be closed", () => {
    const refused = { element: "IC-ODNI" as const, discipline: "humint" as const, kind: "domestic-politics" as const, target: "the other party", question: "What is the other party planning?" };
    expect(taskingRefusal(refused)).toMatch(/political processes/);
    const table = taskChoices(opening, refused)!;
    expect(table.rows.find((row) => row.id === "does")!.cells[0]!.tone).toBe("adverse");
    const lawful = { element: "IC-CIA" as const, discipline: "humint" as const, kind: "foreign-nation" as const, target: "RUS", question: "Where are its reserves moving?" };
    expect(taskingRefusal(lawful)).toBeUndefined();
    const tasked = apply(opening, taskOrder(opening, lawful));
    expect(collectionReading(tasked).taskings).toHaveLength(1);
    expect(taskChoices(tasked, lawful)!.columns[0]!.locked).toMatch(/already gave .* a job today/);
    const id = collectionReading(tasked).taskings[0]!.id;
    expect(closeTaskingChoices(tasked, id)!.columns[0]!.locked).toBeUndefined();
    expect(collectionReading(apply(tasked, closeTaskingOrder(tasked, id))).taskings).toHaveLength(0);
    expect(taskCollection(opening, { ...lawful, targetKind: lawful.kind }).ok).toBe(true);
  });

  it("commissions one of three questions and presses a judgment either way, pricing the building from the packet", () => {
    const table = commissionChoices(opening, "RUS" as NationId)!;
    expect(table.columns.map((column) => column.id)).toEqual(["intent", "capability", "stability"]);
    const asked = apply(opening, commissionOrder(opening, "intent", "RUS" as NationId));
    expect(securityBoard(asked).assessments).toHaveLength(1);
    const id = securityBoard(asked).assessments[0]!.id;
    expect(commissionChoices(asked, "RUS" as NationId)!.columns.find((column) => column.id === "intent")!.locked).toMatch(/already/);
    const press = pressChoices(asked, id, "")!;
    expect(press.columns.every((column) => column.locked)).toBe(true);
    const lean = pressChoices(asked, id, "Read it more firmly")!;
    expect(lean.rows.find((row) => row.id === "bent")!.cells[0]!.text).toMatch(/pts/);
    const pressed = apply(asked, pressOrder(asked, id, "harden", "Read it more firmly"));
    expect(securityBoard(pressed).assessments[0]!.changes).toHaveLength(1);
  });
});

describe("commitments", () => {
  it("lists what is standing with the week's bill, and prices a status change off the engine's packet", () => {
    const placed = withCommitment(opening, deployment("commitment:deployment:test:POL:1", "POL"));
    const reading = commitmentsReading(placed);
    expect(reading.rows.some((row) => row.id === "commitment:deployment:test:POL:1")).toBe(true);
    const table = commitmentChoices(placed, "commitment:deployment:test:POL:1")!;
    expect(table.columns.map((column) => column.id)).toEqual(["suspended", "wound-down"]);
    const wound = apply(placed, commitmentOrder(placed, "commitment:deployment:test:POL:1", "wound-down", "Done."));
    expect(wound.commitments["commitment:deployment:test:POL:1"]!.status).toBe("wound-down");
    expect(() => commitmentOrder(wound, "commitment:deployment:test:POL:1", "active", "Again.")).toThrow();
  });
});

describe("the board", () => {
  it("composes the desk, with the morning's items by urgency", () => {
    const board = securityBoard(opening);
    expect(board.commands.length + board.functional.length).toBe(11);
    expect(board.pdb.marking).toBeDefined();
    const order = { hard: 0, soft: 1, ambient: 2 };
    const ranks = board.pdb.items.map((item) => order[item.urgency]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});
