import { describe, it, expect } from "vitest";
import { worldDataset } from "./index.js";
import { displayName } from "./naming.js";

const byId = new Map(worldDataset.nations.map((n) => [n.id as string, n]));
const nation = (id: string) => {
  const found = byId.get(id);
  if (!found) throw new Error(`test fixture expects nation ${id} in the dataset`);
  return found;
};

describe("world.naming displayName", () => {
  it("flags exactly the nations whose English short name takes 'the'", () => {
    const flagged = worldDataset.nations
      .filter((n) => n.identity.definiteArticle)
      .map((n) => n.id as string)
      .sort();
    expect(flagged).toEqual(["ARE", "BHS", "CAF", "COD", "COG", "COM", "DOM", "GBR", "GMB", "MDV", "MHL", "NLD", "PHL", "SLB", "USA"].sort());
  });

  it("prefixes the article only when both the option and the flag are set", () => {
    expect(displayName(nation("USA"), { article: true })).toBe("the United States");
    expect(displayName(nation("GBR"), { article: true })).toBe("the United Kingdom");
    expect(displayName(nation("ARE"), { article: true })).toBe("the United Arab Emirates");
    expect(displayName(nation("COD"), { article: true })).toBe("the Democratic Republic of the Congo");
    expect(displayName(nation("NLD"), { article: true })).toBe("the Netherlands");
    expect(displayName(nation("PHL"), { article: true })).toBe("the Philippines");
  });

  it("leaves an unflagged nation's name bare even when article is requested", () => {
    expect(displayName(nation("JPN"), { article: true })).toBe("Japan");
    expect(displayName(nation("CHN"), { article: true })).toBe("China");
  });

  it("never prefixes the article when the option is omitted or false", () => {
    expect(displayName(nation("USA"))).toBe("United States");
    expect(displayName(nation("USA"), { article: false })).toBe("United States");
  });
});
