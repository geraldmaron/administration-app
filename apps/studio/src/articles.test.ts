import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { COVER_BRIEF_HELPERS, HOUSE_LOCK_CITE } from "@admin/content";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { findArticle, listArticles } from "../article-catalog.mjs";
// @ts-expect-error — same.
import { publishArticleCover } from "../article-publish.mjs";
// @ts-expect-error — same.
import { houseLocks, resolvePlateAsset } from "../article-store.mjs";
// @ts-expect-error — same.
import { articleFormPage, articlesIndexPage, emptyInput } from "../articles-view.mjs";

const helpers = [
  COVER_BRIEF_HELPERS.situation,
  COVER_BRIEF_HELPERS.metaphor,
  COVER_BRIEF_HELPERS.refuse,
] as const;

const complete = (id: string) => ({
  brief: {
    situation: "A harbor master waiting on a convoy that will not clear.",
    metaphor: "A cracked teacup balanced on a folded sea chart.",
    refuse: "Handshake in front of flags",
  },
  recipe: "object-as-metaphor" as const,
  plate: { assetPath: "plate.png", lockCite: HOUSE_LOCK_CITE },
  kicker: "Week 4",
  headline: findArticle(id)!.headline,
});

describe("the article catalog", () => {
  it("lists real composeArticle pieces, not topic labels", () => {
    const articles = listArticles();
    expect(articles.length).toBeGreaterThan(0);
    expect(articles.every((article: { standfirst: string }) => article.standfirst.length > 0)).toBe(true);
    expect(articles.map((article: { id: string }) => article.id)).toContain("press-border-shipment");
  });
});

describe("the article cover form", () => {
  it("puts Content's three brief helpers next to the plate upload", async () => {
    const page = await articleFormPage("press-border-shipment", {
      fields: emptyInput(findArticle("press-border-shipment")),
    });
    expect(page).toBeTruthy();
    for (const line of helpers) expect(page, line).toContain(line);
    expect(page).toContain('type="file"');
    expect(page).toContain('name="plate"');
    expect(page).toContain('name="lockCite"');
    expect(page).toContain(HOUSE_LOCK_CITE);
  });

  it("closes the recipe on the four house covers", async () => {
    const page = await articleFormPage("press-border-shipment", {
      fields: emptyInput(findArticle("press-border-shipment")),
    });
    expect(page).toContain("object-as-metaphor");
    expect(page).toContain("scene");
    expect(page).toContain("character");
    expect(page).toContain("doodle-diagram");
  });

  it("sits kicker and headline under a full-bleed plate, not a topic thumbnail", async () => {
    const page = await articleFormPage("press-border-shipment", {
      fields: { ...complete("press-border-shipment"), plate: { assetPath: "plate.png", lockCite: HOUSE_LOCK_CITE } },
    });
    expect(page).toContain('class="cover-bleed"');
    expect(page).toContain('class="cover-kicker"');
    expect(page).toContain('class="cover-headline"');
    expect(page).not.toContain("topic-label");
    expect(page).not.toContain("WireTopics");
  });

  it("lists the catalog from the index", () => {
    expect(articlesIndexPage()).toContain("/articles/press-border-shipment");
  });
});

describe("publish stays fail-closed", () => {
  afterEach(() => {
    delete process.env.ARTICLES_WORK;
  });

  it("refuses an empty form against the house lock", async () => {
    const outcome = await publishArticleCover("press-border-shipment", emptyInput(findArticle("press-border-shipment")));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.findings.some((finding: { field: string }) => finding.field.startsWith("brief."))).toBe(true);
    }
  });

  it("refuses a plate that cites a lock whose scan is not on disk", async () => {
    const outcome = await publishArticleCover("press-border-shipment", complete("press-border-shipment"), {
      locks: [{ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg", scanPresent: false }],
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.findings.map((finding: { code: string }) => finding.code)).toContain("lock-scan-absent");
    }
  });

  it("refuses publish without a real uploaded plate even when the house lock is present", async () => {
    const catalog = await houseLocks();
    expect(catalog.locks.some((lock: { id: string }) => lock.id === HOUSE_LOCK_CITE)).toBe(true);
    const withoutPlate = {
      ...complete("press-border-shipment"),
      plate: { assetPath: "", lockCite: HOUSE_LOCK_CITE },
    };
    const outcome = await publishArticleCover("press-border-shipment", withoutPlate, {
      locks: [{ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg", scanPresent: true }],
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.findings.map((finding: { code: string }) => finding.code)).toContain("missing-plate");
    }
  });

  it("does not treat a typed plate path as an upload", async () => {
    process.env.ARTICLES_WORK = await mkdtemp(path.join(tmpdir(), "articles-work-"));
    expect(await resolvePlateAsset("press-border-shipment", "plate.png")).toBe("");
  });

  it("stamps published.json only when the gate accepts a scanned lock", async () => {
    process.env.ARTICLES_WORK = await mkdtemp(path.join(tmpdir(), "articles-work-"));
    await writeFile(path.join(process.env.ARTICLES_WORK, "plate.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const outcome = await publishArticleCover("press-border-shipment", complete("press-border-shipment"), {
      locks: [{ id: HOUSE_LOCK_CITE, version: 1, scanFile: "scan.jpg", scanPresent: true }],
    });
    expect(outcome.ok).toBe(true);
  });
});
