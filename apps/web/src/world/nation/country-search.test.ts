import { describe, expect, it } from "vitest";
import { COUNTRY_VIEWS, countryActHref, countryReturnHref, countryReturnQuery, countryReturnSearch, countrySearch, isCountryView } from "./country-search";

describe("the country file's address", () => {
  it("keeps a view other than the first, so Back and reload return to it", () => {
    expect(countrySearch({ view: "economy" })).toEqual({ view: "economy" });
    expect(countrySearch({ view: "overview" })).toEqual({});
    expect(countrySearch({})).toEqual({});
  });

  it("drops a view that is not one of the six", () => {
    expect(countrySearch({ view: "trade" })).toEqual({});
    expect(countrySearch({ view: 4 })).toEqual({});
    expect(COUNTRY_VIEWS).toHaveLength(6);
    expect(isCountryView("activity")).toBe(true);
  });

  it("keeps the goods the trade view picked, and nothing unreasonable", () => {
    expect(countrySearch({ view: "economy", sector: "steel" })).toEqual({ view: "economy", sector: "steel" });
    expect(countrySearch({ sector: "" })).toEqual({});
    expect(countrySearch({ sector: "x".repeat(81) })).toEqual({});
  });
});


describe("same-government action return context", () => {
  it("keeps country evidence selection independent from changed action terms", () => {
    const origin = countryReturnSearch({ returnView: "economy", returnSector: "steel", sector: "fertilizer" });
    expect(origin).toEqual({ view: "economy", sector: "steel" });
    expect(countryReturnQuery(origin)).toEqual({ returnView: "economy", returnSector: "steel" });
    expect(countryReturnHref("CHN", origin)).toBe("/world/nation/CHN?view=economy&sector=steel");
    expect(countryActHref("CHN", { option: "tariff", sector: "fertilizer" }, origin)).toBe("/world/nation/CHN/act?goal=trade&option=tariff&sector=fertilizer&returnView=economy&returnSector=steel");
  });

  it("uses canonical Overview for direct actions without a valid origin", () => {
    const origin = countryReturnSearch({ returnView: "https://outside.example", returnSector: ["steel"], returnTo: "https://outside.example" });
    expect(origin).toEqual({});
    expect(countryReturnHref("CHN", origin)).toBe("/world/nation/CHN");
    expect(countryActHref("CHN", {}, origin)).toBe("/world/nation/CHN/act");
    expect(countryReturnSearch({ returnSector: "x".repeat(81) })).toEqual({});
  });

  it("encodes selection values as query data and never accepts another destination", () => {
    expect(countryReturnHref("CHN", { view: "economy", sector: "steel&view=security" })).toBe("/world/nation/CHN?view=economy&sector=steel%26view%3Dsecurity");
    expect(countryReturnSearch({ returnView: "overview", returnSector: "steel", returnNation: "RUS" })).toEqual({ sector: "steel" });
  });
});
