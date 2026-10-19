import { EXECUTIVE_ORDERS, orderFiscalEffects, type ReplyOption } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { orderPriceEffects, replyBorrowing } from "./act-prices";

const base = openingCampaign();

function positionReply(resolved: Extract<ReplyOption["commitment"], { readonly kind: "position" }>["resolved"]): ReplyOption {
  return {
    id: "test-reply",
    tone: "conciliatory",
    text: "A test reply.",
    commitment: { kind: "position", cost: {}, remembered: "a test reply", resolved },
  };
}

describe("an act's price", () => {
  it("prices an order on exactly the effects the books read", () => {
    for (const order of EXECUTIVE_ORDERS) expect(orderPriceEffects(base, order)).toEqual(orderFiscalEffects(base, order));
  });
});

describe("a reply's borrowing", () => {
  it("shows the choice borrowing an impact resolved, and nothing else of it", () => {
    const reply = positionReply([
      { kind: "choiceBorrowing", amount: 500 },
      { kind: "opinion", deltas: { prosperity: -0.02 } },
    ]);
    expect(replyBorrowing(reply)).toEqual([{ kind: "choiceBorrowing", amount: 500 }]);
  });

  it("shows nothing for a reply whose impact never borrows", () => {
    const reply = positionReply([{ kind: "opinion", deltas: { prosperity: -0.02 } }]);
    expect(replyBorrowing(reply)).toEqual([]);
  });

  it("shows nothing for an instrument reply — its price is the rung's, not the reply's", () => {
    const reply: ReplyOption = {
      id: "test-instrument-reply",
      tone: "firm",
      text: "A test instrument reply.",
      commitment: { kind: "instrument", instrument: "diplomatic", rung: 1, resolved: [{ kind: "choiceBorrowing", amount: 500 }] },
    };
    expect(replyBorrowing(reply)).toEqual([]);
  });
});
