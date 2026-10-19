import { expect, it } from "vitest";
import { orgSearch } from "./org-search";
it("retains only a bounded country identifier for coalition return context", () => {
  expect(orgSearch({ member: "CAN" })).toEqual({ member: "CAN" });
  expect(orgSearch({ member: "Canada" })).toEqual({});
  expect(orgSearch({ member: ["CAN"] })).toEqual({});
  expect(orgSearch({})).toEqual({});
});
