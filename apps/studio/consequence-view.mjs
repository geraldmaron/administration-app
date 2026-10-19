import { esc, shell } from "./view.mjs";
import { formatCondition } from "./scenario-view.mjs";

// A consequence card rendered for reading rather than as a JSON dump, the
// counterpart to scenario-view.mjs. A card has no branches to walk, so no
// simulator belongs here: the reviewer's judgment is over the prose, the cell
// being filled, and whether the effects booked match the valence claimed.
// Placeholder interpolation is previewed the same way the scenario reader
// does it, because {{actor}} and {{target}} are the only two tokens a card is
// allowed and reading them raw hides how the line actually lands.

const VALENCE_CLASS = { success: "approve", partial: "review", failure: "reject" };

export function valenceBadge(valence) {
  return `<span class="badge ${VALENCE_CLASS[valence] ?? "pending"}">${esc(valence)}</span>`;
}

/** A card's cell in the coverage matrix — the thing coverage is counted over. */
export function cellOf(def) {
  return `${def.instrument}/${def.rungBands.join("+")}/${def.valence}`;
}

const SIGN = (n) => `${n > 0 ? "+" : ""}${n}`;

// Two fields invert the usual reading: rising tension and rising military
// threat are costs, not gains, so coloring by sign alone would show the most
// damaging movement on a card in the color reserved for good news.
const INVERTED = new Set(["tension", "militaryThreat"]);

const isHarmful = (field, value) => (INVERTED.has(field) ? value > 0 : value < 0);

function deltaChips(deltas) {
  return Object.entries(deltas)
    .map(([field, value]) => {
      const tone = isHarmful(field, value) ? "var(--bad)" : "var(--good)";
      return `<span class="chip">${esc(field)} <b style="color:${tone}">${SIGN(value)}</b></span>`;
    })
    .join("");
}

/** One effect as a line a human reads, not the object shape it serializes to. */
export function formatEffect(effect) {
  switch (effect.kind) {
    case "metric":
      return { label: "metric", body: deltaChips(effect.deltas) };
    case "relationship":
      return { label: `relationship · ${esc(effect.direction)}`, body: deltaChips(effect.deltas) };
    case "grudge":
      return { label: "grudge", body: `<span class="chip">weight <b>${effect.weight}</b></span> <span class="k" data-beat>“${esc(effect.cause)}”</span>` };
    case "feed":
      return { label: "feed", body: `<span class="k" data-beat>“${esc(effect.headline)}”</span>` };
    default:
      return { label: "unknown", body: `<code>${esc(JSON.stringify(effect))}</code>` };
  }
}

function effectsTable(def) {
  if (!def.effects?.length) return `<p class="k">No effects — this card marks the board through its flags alone.</p>`;
  const rows = def.effects
    .map((effect) => {
      const { label, body } = formatEffect(effect);
      return `<tr><td class="k" style="white-space:nowrap">${label}</td><td>${body}</td></tr>`;
    })
    .join("");
  return `<div class="wrap"><table>${rows}</table></div>`;
}

/**
 * How much this card takes off the board, on the one normalized scale the
 * valence gate measures. Success may spend at most 0.06 and partial 0.18, so
 * a reviewer who cannot see the number cannot see how close a card sits to
 * being refused — which is exactly the judgment the gate hands to a human.
 */
export function harmfulTotal(def) {
  let total = 0;
  for (const effect of def.effects ?? []) {
    if (effect.kind === "metric" || effect.kind === "relationship") {
      for (const [field, value] of Object.entries(effect.deltas)) {
        const harmful = field === "tension" || field === "militaryThreat" ? value > 0 : value < 0;
        if (harmful) total += Math.abs(value);
      }
    } else if (effect.kind === "grudge") {
      total += effect.weight;
    }
  }
  return Number(total.toFixed(4));
}

const CEILING = { success: 0.06, partial: 0.18 };

function marginNote(def) {
  const ceiling = CEILING[def.valence];
  if (ceiling === undefined) return "";
  const spent = harmfulTotal(def);
  const tight = spent > ceiling * 0.85;
  return `<span class="chip">spends <b style="color:${tight ? "var(--warn)" : "var(--fg)"}">${spent}</b> of ${ceiling}</span>`;
}

export function consequenceMetaChips(def) {
  const chips = [
    `<span class="chip">instrument <b>${esc(def.instrument)}</b></span>`,
    `<span class="chip">band <b>${esc(def.rungBands.join(", "))}</b></span>`,
    `<span class="chip">weight <b>${def.weight}</b></span>`,
    marginNote(def),
  ];
  if (def.once) chips.push(`<span class="chip"><b>fires once</b></span>`);
  if (def.riskAffinity) chips.push(`<span class="chip">risk affinity <b>${esc(def.riskAffinity)}</b></span>`);
  return chips.filter(Boolean).join("");
}

/** The token preview: the two placeholders a card may carry, filled in live. */
function beatsPreview(def) {
  const beats = def.beats
    .map((text) => `<div class="beat"><div class="say" data-beat>${esc(text)}</div></div>`)
    .join("");
  const remembered = def.remembered
    ? `<div class="outcome" style="margin-top:14px"><div class="k">The board remembers</div><div class="say" style="font-family:var(--serif);margin-top:4px" data-beat>${esc(def.remembered)}</div></div>`
    : "";
  return `<div class="card">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <label class="k">actor <input data-token="actor" value="United States" size="14"></label>
      <label class="k">target <input data-token="target" value="the counterpart" size="16"></label>
    </div>
    <div id="cq-stage">${beats}${remembered}</div>
  </div>`;
}

/**
 * Interpolation runs over every {{actor}}/{{target}} on the page, not just the
 * beats — a feed headline and a grudge cause carry the same placeholders, and
 * a reviewer reading one of them raw is reading a line no player will see.
 * Deferred to the end of the document so the effects table has already parsed.
 */
function tokenPreviewScript() {
  return `<script>
  (() => {
    const nodes = [...document.querySelectorAll("[data-beat]")].map((el) => ({ el, source: el.textContent }));
    const inputs = [...document.querySelectorAll("[data-token]")];
    if (!nodes.length || !inputs.length) return;
    const paint = () => {
      const vars = Object.fromEntries(inputs.map((i) => [i.dataset.token, i.value || i.dataset.token]));
      for (const { el, source } of nodes) {
        el.innerHTML = source
          .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
          .replace(/\\{\\{\\s*(actor|target)\\s*\\}\\}/g, (whole, key) =>
            '<span class="tok">' + (vars[key] ?? whole) + "</span>");
      }
    };
    inputs.forEach((i) => i.addEventListener("input", paint));
    paint();
  })();
  </script>`;
}

/**
 * The full reader page for one consequence card, wherever it lives (job output
 * or shipped pack). Callers supply the chrome: breadcrumb, active nav item,
 * and any admin actions.
 */
export function consequenceReaderPage(def, { crumb, active, adminHtml }) {
  const conditions = def.conditions?.length ? def.conditions.map(formatCondition).map(esc).join(" · ") : "always live";
  const flags = def.sets?.length
    ? def.sets.map((flag) => `<span class="chip"><b>${esc(flag)}</b></span>`).join("")
    : `<span class="k">sets no flag</span>`;

  return shell(
    def.id,
    `<div class="crumb">${crumb}</div>
<div class="pagehead"><h1>${esc(cellOf(def))}</h1>${valenceBadge(def.valence)}<code>${esc(def.id)}</code></div>
<div>${consequenceMetaChips(def)}</div>
<p class="k">Conditions: ${conditions}</p>

<h2>The aftermath</h2>
${beatsPreview(def)}

<h2>What it books</h2>
${effectsTable(def)}

<h2>What it leaves behind</h2>
<div>${flags}</div>
${adminHtml ?? ""}
${tokenPreviewScript()}`,
    { active },
  );
}

/** The compact form used in a job's review queue. */
export function consequenceSummary(def) {
  return {
    title: cellOf(def),
    badge: valenceBadge(def.valence),
    meta: [
      `<code>${esc(def.id)}</code> · weight ${def.weight} · ${def.beats.length} beat(s) · spends ${harmfulTotal(def)}`,
      `sets: ${def.sets?.length ? def.sets.map(esc).join(", ") : "nothing"}`,
    ],
    excerpt: def.beats[0] ?? "",
  };
}
