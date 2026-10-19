// Editor cover form. The player never sees this page. Kicker and headline
// sit under a full-bleed plate, not a thumbnail beside a topic label.

import { COVER_BRIEF_HELPERS, COVER_HOUSE_LAW, COVER_RECIPES, HOUSE_LOCK_CITE } from "@admin/content";
import { findArticle, listArticles } from "./article-catalog.mjs";
import { coverStatus } from "./article-publish.mjs";
import { esc, shell } from "./view.mjs";

export function articlesIndexPage() {
  const rows = listArticles()
    .map(
      (article) => `<tr>
      <td><a href="/articles/${esc(article.id)}">${esc(article.headline)}</a>
        <div class="k"><code>${esc(article.id)}</code> · ${esc(article.outlet)} · week ${article.turn}</div></td>
      <td>${esc(article.kind)}</td>
      <td class="k">${esc(article.standfirst)}</td>
    </tr>`,
    )
    .join("");
  return shell(
    "Article covers",
    `<div class="pagehead"><h1>Article covers</h1></div>
<p class="lede">Project Phoenix. Each row is a real <code>composeArticle</code> piece. Open one, fill the CoverPackage, and publish — the gate fails closed until the brief, recipe, plate, lock cite, kicker and headline all stand.</p>
<div class="wrap"><table>
<tr><th>Article</th><th>Kind</th><th>Standfirst</th></tr>
${rows}
</table></div>`,
    { active: "/articles" },
  );
}

export async function articleFormPage(id, { error, notice, fields } = {}) {
  const article = findArticle(id);
  if (!article) return undefined;
  const input = fields ?? emptyInput(article);
  const { judgment, published, catalog } = await coverStatus(id, input);
  const findings = judgment.ok ? [] : judgment.findings;
  const plateHref = input.plate.assetPath ? `/articles/${encodeURIComponent(id)}/plate` : "";
  return shell(
    article.headline,
    `${crumb(article)}
${notice ? `<div class="card good"><div class="k">${esc(notice)}</div></div>` : ""}
${error ? `<div class="card bad"><div class="defect">${esc(error)}</div></div>` : ""}
${findings.length ? findingsList(findings) : ""}
${published ? `<div class="card good"><div class="k">Published ${esc(published.publishedAt)} — CoverPackage is on disk.</div></div>` : ""}
<div class="cover-split">
  ${coverPreview(input, plateHref)}
  ${coverForm(article, input, catalog, findings)}
</div>
<p class="k" style="margin-top:18px">${esc(COVER_HOUSE_LAW.hand)}. ${esc(COVER_HOUSE_LAW.paper)}. ${esc(COVER_HOUSE_LAW.fills)}. ${esc(COVER_HOUSE_LAW.crop)}. Design owns the lock scan in <code>content/cover-locks/v1/</code>.</p>`,
    {
      active: "/articles",
      crumb: `<a href="/articles">Articles</a> / ${esc(article.id)}`,
    },
  );
}

function emptyInput(article) {
  return {
    brief: { situation: "", metaphor: "", refuse: "" },
    recipe: "",
    plate: { assetPath: "", lockCite: "" },
    kicker: "",
    headline: article.headline,
  };
}

function crumb(article) {
  return `<div class="pagehead"><h1>${esc(article.headline)}</h1></div>
<p class="lede">${esc(article.outlet)} · week ${article.turn} · <code>${esc(article.id)}</code>. ${esc(article.standfirst)}</p>`;
}

function findingsList(findings) {
  const items = findings.map((finding) => `<li><code>${esc(finding.field)}</code> — ${esc(finding.message)}</li>`).join("");
  return `<div class="card bad"><h3>Publish refused</h3><ul class="defect">${items}</ul></div>`;
}

function coverPreview(input, plateHref) {
  const plate = plateHref
    ? `<img src="${esc(plateHref)}" alt="Cover plate">`
    : `<div class="cover-empty">No plate yet. Upload a felt-tip scan that cites the house lock.</div>`;
  return `<section class="cover-stage" aria-label="Cover preview">
    <div class="cover-bleed">${plate}</div>
    <div class="cover-under">
      <div class="cover-kicker">${esc(input.kicker || "Kicker")}</div>
      <div class="cover-headline">${esc(input.headline || "Headline")}</div>
    </div>
  </section>`;
}

function coverForm(article, input, catalog, findings) {
  const flagged = new Set(findings.map((finding) => finding.field));
  const mark = (field) => (flagged.has(field) ? ' aria-invalid="true"' : "");
  return `<form class="card cover-form" method="post" action="/articles/${esc(article.id)}" enctype="multipart/form-data">
    <h3>CoverPackage</h3>
    <p class="k">Three brief fields next to the plate. Not a style memo.</p>
    ${briefFields(input, mark)}
    ${recipeAndPlateFields(input, catalog, mark)}
    <label${mark("kicker")}>Kicker
      <input name="kicker" value="${esc(input.kicker)}" required>
    </label>
    <label${mark("headline")}>Headline
      <input name="headline" value="${esc(input.headline)}" required>
    </label>
    <div class="toolbar">
      <button class="quiet" type="submit" name="intent" value="save">Save draft</button>
      <button type="submit" name="intent" value="publish">Publish cover</button>
    </div>
    <p class="k">Publish stays blocked until the package is valid. No brief, no cover.</p>
  </form>`;
}

function briefFields(input, mark) {
  return ["situation", "metaphor", "refuse"]
    .map(
      (name) => `<label${mark(`brief.${name}`)}>${name[0].toUpperCase()}${name.slice(1)}
      <textarea name="${name}" rows="${name === "refuse" ? 2 : 3}" required>${esc(input.brief[name])}</textarea>
      <span class="k">${esc(COVER_BRIEF_HELPERS[name])}</span>
    </label>`,
    )
    .join("");
}

function recipeAndPlateFields(input, catalog, mark) {
  const recipes = COVER_RECIPES.map(
    (recipe) => `<option value="${esc(recipe)}" ${input.recipe === recipe ? "selected" : ""}>${esc(recipe)}</option>`,
  ).join("");
  const locks = catalog.locks
    .map((lock) => {
      const note = lock.scanPresent ? "" : " — scan not dropped yet";
      return `<option value="${esc(lock.id)}" ${input.plate.lockCite === lock.id ? "selected" : ""}>${esc(lock.id)}${esc(note)}</option>`;
    })
    .join("");
  return `<label${mark("recipe")}>Recipe
      <select name="recipe" required>
        <option value="">Choose a house recipe</option>
        ${recipes}
      </select>
    </label>
    <label${mark("plate.assetPath")}>Plate
      <input type="file" name="plate" accept="image/png,image/jpeg,image/webp">
      <span class="k">${input.plate.assetPath ? `On disk: ${esc(input.plate.assetPath)}` : "Upload the scan drawn against the lock."}</span>
    </label>
    <input type="hidden" name="plateAssetPath" value="${esc(input.plate.assetPath ?? "")}">
    <label${mark("plate.lockCite")}>Lock citation
      <select name="lockCite" required>
        <option value="">Cite a versioned lock</option>
        ${locks}
      </select>
      <span class="k">The lock is <code>${esc(HOUSE_LOCK_CITE)}</code>, not a prompt.</span>
    </label>`;
}

export { emptyInput };
