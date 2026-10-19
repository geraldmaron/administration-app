// The console's HTTP server and route table. Seed-derived pages are rendered
// from a campaign generated for the requested seed; everything else is async
// and reads live artifacts. Internal only, localhost-only, never player-facing.
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { worldDataset } from "@admin/world";
import { esc, shell as sharedShell } from "./view.mjs";
import { findJobItem, handleScenarioAction, jobStatusJson, runSummaries, scenarioDetailPage, scenariosIndexPage } from "./scenarios-view.mjs";
import { previewScenario } from "@admin/content";
import { scenarioReaderPage } from "./scenario-view.mjs";
import { replyEffectsSection } from "./reply-effects-view.mjs";
import { consequenceReaderPage } from "./consequence-view.mjs";
import { findLibraryScenario, libraryPage } from "./library-view.mjs";
import { statusPage } from "./status-view.mjs";
import { commandCenterPage } from "./command-center.mjs";
import { explorerPage, searchPage } from "./explorer-view.mjs";
import { createJob, newJobPage } from "./job-launch-view.mjs";
import { deleteJob, deleteScenario, editJobPage, editScenarioPage, updateJob, updateScenario } from "./job-admin.mjs";
import { peoplePage, personPage, portraitsPage, rolesPage } from "./people-view.mjs";
import { setRoleProfile } from "./role-edit.mjs";
import { backstoriesPage, namesPage } from "./nation-view.mjs";
import { canPublish, datasetRole, discardEdit, overlayEnabled, pendingEdits } from "./overlay-store.mjs";
import { publishEdits, readNationsSource } from "./overlay-publish.mjs";
import { overlayPage } from "./overlay-view.mjs";
import { listArticles } from "./article-catalog.mjs";
import { handleArticlePost, renderArticleForm, serveArticlePlate, serveLockScan } from "./article-routes.mjs";
import { DEFAULT_SEED, campaignFor, handleDatasetRoute, seedOf } from "./dataset-routes.mjs";
import { articlesIndexPage } from "./articles-view.mjs";

// The console's front door and its content half, plus the cast pages; the
// dataset half — every nation field with its definition, the typed editor,
// the metric and force catalogs — is mounted from dataset-routes.mjs, and the
// one write path into authored source is the overlay it feeds.
// Deliberately dependency free beyond the built workspace packages: what
// renders here is the real dataset and the real generation state, never a
// fixture that can drift from either.

// Every relative path in this server and the modules it composes (content
// job files, review records, the world dataset source) is written against
// the repo root, not wherever `node dev-server.mjs` happened to be launched
// from — pinning the working directory here is what keeps that assumption
// true regardless of invocation.
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));

const PORT = Number(process.env.PORT ?? 4400);
const ROLE_ATTRIBUTES = ["competence", "loyalty", "ambition", "integrity", "charisma"];

// The cast pages are keyed to a seed in the query string; the scenario pages
// are not seeded, so the shell's seed input only appears where a seed means
// something.
const shell = (title, body, seed, active) => sharedShell(title, body, { ...(seed !== undefined ? { seed } : {}), active });

/** A scenario's reader page with what each of its replies does on a live board. */
function scenarioPageWithEffects(def, chrome, url) {
  const preview = previewScenario(def, Number(url.searchParams.get("board") ?? 0), url.searchParams.get("counterpart") || undefined);
  return scenarioReaderPage(def, {
    ...chrome,
    effectsHtml: replyEffectsSection(preview, url.pathname, chrome.nations),
    ...(preview.subject ? { title: preview.subject } : {}),
  });
}

const simulatorNations = () =>
  worldDataset.nations.map((n) => ({
    id: String(n.id),
    name: n.identity.name,
    adjective: n.identity.adjective,
  }));

/**
 * The non-scenario half of a global search.
 *
 * It lives here rather than in the search view because the cast and the
 * dataset are seed-derived — the console's own default campaign — and the
 * explorer has no business knowing how a campaign is rolled. The scenario half
 * is the view's own.
 */
async function crossSections(term) {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const { nations, people } = campaignFor(DEFAULT_SEED);
  const runs = await runSummaries();
  const hit = (text) => String(text).toLowerCase().includes(needle);

  return [
    {
      title: "Runs",
      rows: runs
        .filter((run) => hit(run.jobId))
        .slice(0, 10)
        .map((run) => ({
          href: `/scenarios/${encodeURIComponent(run.jobId)}`,
          label: run.jobId,
          note: run.error ? run.error : `${run.stage} · ${run.done}/${run.total} done`,
        })),
    },
    {
      title: "Nations",
      rows: nations
        .filter((nation) => hit(nation.identity.name) || hit(nation.id))
        .slice(0, 10)
        .map((nation) => ({
          href: `/nations/${encodeURIComponent(nation.id)}`,
          label: nation.identity.name,
          note: `${nation.bands.archetype} · power tier ${nation.bands.powerTier}`,
        })),
    },
    {
      title: "People",
      rows: people
        .filter((person) => hit(person.name))
        .slice(0, 10)
        .map((person) => ({
          href: `/people/${encodeURIComponent(person.id)}`,
          label: person.name,
          note: `${person.nationality} · ${(person.eligibleRoles[0] ?? "unassigned").replace("role-", "")}`,
        })),
    },
    {
      title: "Articles",
      rows: listArticles()
        .filter((article) => hit(article.id) || hit(article.headline) || hit(article.outlet))
        .slice(0, 10)
        .map((article) => ({
          href: `/articles/${encodeURIComponent(article.id)}`,
          label: article.headline,
          note: `${article.outlet} · ${article.id}`,
        })),
    },
  ];
}

// Form posts only, and small ones — a decision, a note, a reviewer name — so
// buffering the whole body before parsing needs no size guard here.
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

const SCENARIO_ACTION = /^\/scenarios\/([^/]+)(?:\/(scaffold|finish|materialize|decide|decide-bulk|reviewer|edit|update|delete))?$/;
// One item route for every job kind: the segment names what is being read
// (a scenario, a consequence card) so a URL still says what it points at,
// while the kind descriptor decides which reader renders it.
const SCENARIO_ITEM = /^\/scenarios\/([^/]+)\/(?:scenario|card)\/([^/]+)(?:\/(edit|update|delete))?$/;
const SCENARIO_STATUS = /^\/scenarios\/([^/]+)\/status\.json$/;
const LIBRARY_ITEM = /^\/library\/([^/]+)$/;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const html = (body) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  };
  const redirect = (location) => {
    res.writeHead(303, { Location: location });
    res.end();
  };
  try {
    // No sign-in gate: the console is a single-operator, localhost-only tool,
    // so every request is treated as the one operator who can reach this port.
    const gate = { ok: true };

    if (url.pathname === "/" && req.method === "GET") {
      return html(await commandCenterPage());
    }
    if (url.pathname === "/explore" && req.method === "GET") {
      return html(await explorerPage(url.searchParams));
    }
    if (url.pathname === "/search" && req.method === "GET") {
      return html(await searchPage(url.searchParams, await crossSections(url.searchParams.get("q") ?? "")));
    }
    if (url.pathname === "/status" && req.method === "GET") {
      return html(await statusPage());
    }
    if (url.pathname === "/scenarios" && req.method === "GET") {
      return html(await scenariosIndexPage(url.searchParams));
    }
    if (url.pathname === "/library" && req.method === "GET") {
      return html(await libraryPage(url.searchParams));
    }
    if (url.pathname === "/articles" && req.method === "GET") {
      return html(articlesIndexPage());
    }
    const articlePlate = url.pathname.match(/^\/articles\/([^/]+)\/plate$/);
    if (articlePlate && req.method === "GET") {
      const served = await serveArticlePlate(res, decodeURIComponent(articlePlate[1]));
      if (served) return;
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("no plate uploaded for this article");
      return;
    }
    const articleMatch = url.pathname.match(/^\/articles\/([^/]+)$/);
    if (articleMatch) {
      const id = decodeURIComponent(articleMatch[1]);
      if (req.method === "GET") {
        const page = await renderArticleForm(id, url.searchParams);
        if (!page) {
          res.writeHead(404, { "content-type": "text/plain" });
          res.end(`no article "${id}"`);
          return;
        }
        return html(page);
      }
      if (req.method === "POST") {
        const outcome = await handleArticlePost(req, id);
        if (outcome.location) return redirect(outcome.location);
        res.writeHead(outcome.status, { "content-type": "text/plain" });
        res.end(outcome.text ?? "");
        return;
      }
    }
    if (url.pathname === "/cover-locks/v1/scan" && req.method === "GET") {
      const served = await serveLockScan(res);
      if (served) return;
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Design has not dropped the v1 felt-tip lock scan yet");
      return;
    }
    const libraryMatch = url.pathname.match(LIBRARY_ITEM);
    if (libraryMatch && req.method === "GET") {
      const scenarioId = decodeURIComponent(libraryMatch[1]);
      const def = await findLibraryScenario(scenarioId);
      if (!def) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end(`no shipped scenario "${scenarioId}"`);
        return;
      }
      return html(scenarioPageWithEffects(def, {
        crumb: `<a href="/library">Library</a> / ${esc(scenarioId)}`,
        active: "/library",
        nations: simulatorNations(),
      }, url));
    }
    // The cast pages read the whole generated pool and take filters, so they
    // sit outside the seed-only route table above.
    if (url.pathname === "/people" && req.method === "GET") {
      return html(peoplePage(campaignFor(seedOf(url)).people, seedOf(url), url.searchParams));
    }
    if (url.pathname === "/portraits" && req.method === "GET") {
      return html(portraitsPage(campaignFor(seedOf(url)).people, seedOf(url), url.searchParams));
    }
    if (url.pathname === "/roles" && req.method === "GET") {
      return html(
        rolesPage(
          campaignFor(seedOf(url)).people,
          seedOf(url),
          url.searchParams.get("error") ?? undefined,
          url.searchParams.get("saved") ?? undefined,
        ),
      );
    }
    const roleMatch = url.pathname.match(/^\/roles\/([a-z-]+)$/);
    if (roleMatch && req.method === "POST") {
      const body = await readBody(req);
      const seed = body.get("seed") || DEFAULT_SEED;
      const num = (name) => Number(body.get(name));
      const attributes = {};
      for (const attribute of ROLE_ATTRIBUTES) {
        attributes[attribute] = { min: num(`${attribute}Min`), max: num(`${attribute}Max`) };
      }
      const outcome = await setRoleProfile(roleMatch[1], {
        attributes,
        ageRange: { min: num("ageMin"), max: num("ageMax") },
        ideologySpread: num("ideologySpread"),
      });
      return redirect(
        `/roles?${new URLSearchParams(
          outcome.ok ? { seed, saved: roleMatch[1] } : { seed, error: outcome.reason },
        )}`,
      );
    }
    const personMatch = url.pathname.match(/^\/people\/([A-Za-z0-9-]+)$/);
    if (personMatch && req.method === "GET") {
      const seed = seedOf(url);
      const person = campaignFor(seed).people.find((candidate) => String(candidate.id) === personMatch[1]);
      if (!person) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end(`no person "${personMatch[1]}" in the pool this seed generates`);
        return;
      }
      return html(personPage(person, seed));
    }

    const statusMatch = url.pathname.match(SCENARIO_STATUS);
    if (statusMatch && req.method === "GET") {
      const snapshot = await jobStatusJson(decodeURIComponent(statusMatch[1]));
      res.writeHead(snapshot ? 200 : 404, { "content-type": "application/json" });
      res.end(JSON.stringify(snapshot ?? { error: "no such job" }));
      return;
    }
    if (url.pathname === "/scenarios/new") {
      if (req.method === "GET") return html(await newJobPage(url.searchParams));
      if (req.method === "POST") {
        const outcome = await createJob(await readBody(req));
        return outcome.ok
          ? redirect(`/scenarios/${encodeURIComponent(outcome.id)}`)
          : redirect(`/scenarios/new?${new URLSearchParams({ error: outcome.error, id: outcome.id })}`);
      }
    }
    if (url.pathname === "/names" && req.method === "GET") {
      return html(namesPage(url.searchParams));
    }
    if (url.pathname === "/backstories" && req.method === "GET") {
      return html(backstoriesPage());
    }
    if (url.pathname === "/overlay" && req.method === "GET") {
      const role = await datasetRole(gate);
      return html(
        overlayPage(role ? await pendingEdits(gate) : [], {
          enabled: overlayEnabled,
          role,
          source: role ? await readNationsSource() : undefined,
          error: url.searchParams.get("error") ?? undefined,
          notice: url.searchParams.get("notice") ?? undefined,
        }),
      );
    }
    if (url.pathname === "/overlay/publish" && req.method === "POST") {
      // Checked here and not only in the view: a hidden button is a hint, and
      // the database refuses this anyway — but a request that will be refused
      // should not first rewrite nations.ts and rebuild @admin/world.
      if (!canPublish(await datasetRole(gate))) {
        return redirect(`/overlay?${new URLSearchParams({ error: "publishing to source is an admin's grant" })}`);
      }
      const outcome = await publishEdits(gate, await pendingEdits(gate));
      const params = outcome.ok
        ? { notice: outcome.warning ?? `published ${outcome.published} edit(s) into nations.ts and rebuilt @admin/world` }
        : { error: outcome.reason };
      return redirect(`/overlay?${new URLSearchParams(params)}`);
    }
    if (url.pathname === "/overlay/discard" && req.method === "POST") {
      const body = await readBody(req);
      const outcome = await discardEdit(gate, body.get("id") ?? "");
      return redirect(`/overlay?${new URLSearchParams(outcome.ok ? {} : { error: outcome.reason })}`);
    }

    if (await handleDatasetRoute({ url, req, session: gate, html, redirect, readBody: () => readBody(req) })) return;

    const itemMatch = url.pathname.match(SCENARIO_ITEM);
    if (itemMatch) {
      const [, rawJobId, rawScenarioId, action] = itemMatch;
      const jobId = decodeURIComponent(rawJobId);
      const scenarioId = decodeURIComponent(rawScenarioId);
      const editUrl = `/scenarios/${encodeURIComponent(jobId)}/scenario/${encodeURIComponent(scenarioId)}/edit`;
      if (!action && req.method === "GET") {
        const found = await findJobItem(jobId, scenarioId);
        if (!found) {
          res.writeHead(404, { "content-type": "text/plain" });
          res.end(`no journaled-done item "${scenarioId}" in job "${jobId}"`);
          return;
        }
        const { def, kind } = found;
        const chrome = {
          crumb: `<a href="/scenarios">Runs</a> / <a href="/scenarios/${encodeURIComponent(jobId)}">${esc(jobId)}</a> / ${esc(scenarioId)}`,
          active: "/scenarios",
          adminHtml: kind.editable
            ? `<p style="margin-top:18px"><a class="k" href="${editUrl}">edit / delete this ${esc(kind.noun)}</a></p>`
            : "",
        };
        return html(
          kind.kind === "consequence-batch"
            ? consequenceReaderPage(def, chrome)
            : scenarioPageWithEffects(def, { ...chrome, nations: simulatorNations() }, url),
        );
      }
      // The source editor parses a ScenarioDef, so it is offered only where
      // that is what the job produces. Refusing here rather than at the link
      // keeps a hand-typed URL from reaching a parser built for another shape.
      if (action) {
        const found = await findJobItem(jobId, scenarioId);
        if (found && !found.kind.editable) {
          res.writeHead(405, { "content-type": "text/plain" });
          res.end(`a ${found.kind.noun} has no source editor — edit its .out.json and re-run the job`);
          return;
        }
      }
      if (action === "edit" && req.method === "GET") {
        return html(await editScenarioPage(jobId, scenarioId, url.searchParams.get("error") ?? undefined));
      }
      if (action === "update" && req.method === "POST") {
        const outcome = await updateScenario(jobId, scenarioId, await readBody(req));
        return outcome.ok
          ? redirect(`/scenarios/${encodeURIComponent(jobId)}`)
          : redirect(`${editUrl}?${new URLSearchParams({ error: outcome.error })}`);
      }
      if (action === "delete" && req.method === "POST") {
        const outcome = await deleteScenario(jobId, scenarioId, await readBody(req));
        return outcome.ok
          ? redirect(`/scenarios/${encodeURIComponent(jobId)}`)
          : redirect(`${editUrl}?${new URLSearchParams({ error: outcome.error })}`);
      }
    }

    const scenarioMatch = url.pathname.match(SCENARIO_ACTION);
    if (scenarioMatch) {
      const [, rawJobId, action] = scenarioMatch;
      const jobId = decodeURIComponent(rawJobId);
      const editUrl = `/scenarios/${encodeURIComponent(jobId)}/edit`;
      if (action === "edit" && req.method === "GET") {
        return html(await editJobPage(jobId, url.searchParams.get("error") ?? undefined));
      }
      if (action === "update" && req.method === "POST") {
        const outcome = await updateJob(jobId, await readBody(req));
        return outcome.ok
          ? redirect(`/scenarios/${encodeURIComponent(jobId)}`)
          : redirect(`${editUrl}?${new URLSearchParams({ error: outcome.error })}`);
      }
      if (action === "delete" && req.method === "POST") {
        const outcome = await deleteJob(jobId, await readBody(req));
        return outcome.ok ? redirect("/scenarios") : redirect(`${editUrl}?${new URLSearchParams({ error: outcome.error })}`);
      }
      if (action && req.method === "POST") {
        const body = await readBody(req);
        await handleScenarioAction(jobId, action, body);
        // A redirect, not a render: the detail page recomputes readiness live
        // from what's on disk on every GET, so nothing the mutation produced
        // needs carrying across — and a redirect keeps a page reload from
        // resubmitting the form.
        return redirect(`/scenarios/${encodeURIComponent(jobId)}`);
      }
      if (!action && req.method === "GET") {
        return html(await scenarioDetailPage(jobId, url.searchParams));
      }
    }

    {
      // A plain-text dead end left an operator with the back button as the only
      // exit; the rail is the point of the frame.
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end(
        sharedShell("Not found", `<h1>No such view</h1>
<p class="lede">Nothing is served at <code>${esc(url.pathname)}</code>. A URL from an older layout, or a run that has since been deleted.</p>
<p class="k">Everything the console can show is in the rail, and <b>/</b> searches across scenarios, runs, nations and people.</p>`),
      );
      return;
    }
  } catch (error) {
    // Surfacing the failure is the whole point of an inspector: a dataset (or
    // a review record) that cannot be rendered is a problem worth seeing, not
    // one to hide.
    // Still the whole stack — this is an inspector, and a swallowed render
    // failure is a dataset problem nobody sees. But inside the frame, so the
    // way out is a link rather than the back button.
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(
      sharedShell("Render failed", `<h1>This view could not render</h1>
<p class="lede"><code>${esc(url.pathname + url.search)}</code> threw while building the page. The dataset or the run behind it is in a state the console cannot describe — that is the finding, not a display bug.</p>
<pre class="card" style="overflow:auto;white-space:pre-wrap;font-size:12px">${esc(error instanceof Error ? error.stack : String(error))}</pre>`),
    );
  }
});

server.listen(PORT, () => {
  console.log(`studio inspector on http://localhost:${PORT}`);
});
