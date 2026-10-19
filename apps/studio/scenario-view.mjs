import { esc, shell } from "./view.mjs";

// A scenario rendered for reading and play-through, not a JSON dump. The
// server side renders the static reader (subject, meta, conditions, tree);
// the simulator itself runs client-side against the def embedded as JSON, so
// stepping through beats and picking replies costs no round-trips. Placeholder
// interpolation mirrors scenario-cast.ts's renderText: same {{token}} regex,
// same fallback of leaving an unknown token standing (styled, so it looks
// deliberate rather than broken).

function boundsLabel(label, condition) {
  const parts = [];
  if (condition.atLeast !== undefined) parts.push(`≥ ${condition.atLeast}`);
  if (condition.atMost !== undefined) parts.push(`≤ ${condition.atMost}`);
  return `${label} ${parts.join(", ")}`.trim();
}

export function formatCondition(condition) {
  switch (condition.kind) {
    case "metric":
      return boundsLabel(condition.metric, condition);
    case "alignment":
      return boundsLabel(condition.axis, condition);
    case "relationship":
      return boundsLabel(`counterpart.${condition.field}`, condition);
    case "counterpartTrait":
      return boundsLabel(`counterpart.${condition.trait}`, condition);
    case "cabinetAttribute":
      return boundsLabel(`${condition.roleHint}.${condition.attribute}`, condition);
    case "flag":
      return `flag "${condition.flag}" is ${condition.is}`;
    case "turn":
      return boundsLabel("turn", condition);
    case "removalPressure":
      return boundsLabel("removal pressure", condition);
    case "charterInstitution":
      return `charter's ${condition.institution} present: ${condition.present}`;
    default:
      return JSON.stringify(condition);
  }
}

export function formatCommitment(commitment) {
  if (commitment.kind === "instrument") return `${commitment.instrument} instrument · rung ${commitment.rung} of 5`;
  const costs = Object.entries(commitment.cost)
    .map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`)
    .join(", ");
  return `position · ${costs || "no direct cost"}`;
}

const TONE_ORDER = ["conciliatory", "firm", "principled", "evasive", "coercive"];

function toneDot(tone) {
  return `<span class="tone" style="background:var(--tone-${esc(tone)})"></span>`;
}

function metaChips(def) {
  const chips = [
    `<span class="chip">class <b>${esc(def.class)}</b></span>`,
    `<span class="chip">cast <b>${esc(def.cast.pick)}</b></span>`,
    `<span class="chip">weight <b>${def.weight}</b></span>`,
  ];
  if (def.once) chips.push(`<span class="chip"><b>fires once</b></span>`);
  for (const boost of def.boosts ?? []) chips.push(`<span class="chip">boost <b>${esc(boost.source)}</b> ×${boost.factor}</span>`);
  if (def.setPiece) chips.push(`<span class="chip">set piece · <b>${esc(def.setPiece.owner)}</b></span>`);
  return chips.join("");
}

/** The decision tree, laid flat: the opening as root, one branch per reply with its full downstream consequence. */
function treeView(def) {
  const root = `<div class="node root"><b>${esc(def.subject)}</b>
    <div class="k">${def.opening.length} opening beat(s) · ${def.replies.length} branches</div></div>`;
  const branches = def.replies
    .map((reply) => {
      const consequences = [];
      consequences.push(formatCommitment(reply.commitment));
      if (reply.commitment.kind === "position") consequences.push(`remembered: “${reply.commitment.remembered}”`);
      if (reply.press) consequences.push(`press: “${reply.press}”`);
      if (reply.sets?.length) consequences.push(`sets: ${reply.sets.join(", ")}`);
      return `<div class="node">${toneDot(reply.tone)}<b>${esc(reply.tone)}</b> · <code>${esc(reply.id)}</code>
        <div style="margin-top:5px">${esc(reply.text)}</div>
        ${consequences.map((c) => `<div class="k">${esc(c)}</div>`).join("")}</div>`;
    })
    .join("");
  return `<div class="tree"><div class="col">${root}</div><div class="col" style="flex:2">${branches}</div></div>`;
}

/**
 * The playable simulator: beats reveal in order, replies present as choices,
 * a pick shows its full consequence. Counterpart, leader, and nation controls
 * re-render every interpolated string live.
 */
function simulator(def, nations) {
  // The President's own country is never the counterpart a scenario binds.
  const payload = { def, nations: nations.filter((nation) => nation.id !== "USA") };
  return `
  <div class="card" id="sim">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <label class="k">counterpart <select id="sim-counterpart"></select></label>
      <label class="k">leader <input id="sim-leader" value="President Ward" size="14"></label>
      <label class="k">title <input id="sim-title" value="the President" size="12"></label>
      <button class="quiet" id="sim-reset" type="button">Restart</button>
    </div>
    <div id="sim-stage"></div>
  </div>
  <script id="sim-data" type="application/json">${JSON.stringify(payload).replace(/</g, "\\u003c")}</script>
  <script>
  (() => {
    const { def, nations } = JSON.parse(document.getElementById("sim-data").textContent);
    const stage = document.getElementById("sim-stage");
    const pickCounterpart = document.getElementById("sim-counterpart");
    const leaderInput = document.getElementById("sim-leader");
    const titleInput = document.getElementById("sim-title");
    nations.forEach((n, i) => pickCounterpart.add(new Option(n.name, String(i))));
    const INSTITUTIONS = { assembly: "the National Assembly", judiciary: "the High Court", executive: "the Executive Council" };
    let revealed = 1, picked = null;

    const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const render = (text) => {
      const cp = nations[Number(pickCounterpart.value)] ?? { name: "the counterpart", adjective: "foreign" };
      const home = { name: "United States" };
      const vars = {
        counterpart: cp.name, counterpartAdjective: cp.adjective ?? cp.name,
        leader: leaderInput.value || "the leader", title: titleInput.value || "the leader",
        nation: home.name, ...INSTITUTIONS,
      };
      return escHtml(text).replace(/\\{\\{\\s*([a-zA-Z]+)\\s*\\}\\}/g, (whole, key) =>
        vars[key] ? escHtml(vars[key]) : '<span class="tok">' + whole + "</span>");
    };

    const speakerLabel = (s) => s.kind === "cabinet" ? "cabinet · " + s.roleHint : s.kind === "counterpart" ? "counterpart" : s.kind;
    const commitmentLine = (c) => c.kind === "instrument"
      ? c.instrument + " instrument · rung " + c.rung + " of 5"
      : "position · " + (Object.entries(c.cost).map(([k, v]) => k + " " + (v > 0 ? "+" : "") + v).join(", ") || "no direct cost");

    function draw() {
      let html = "";
      def.opening.slice(0, revealed).forEach((beat) => {
        html += '<div class="beat ' + beat.speaker.kind + '"><div class="who">' + escHtml(speakerLabel(beat.speaker)) + '</div><div class="say">' + render(beat.text) + "</div></div>";
      });
      if (revealed < def.opening.length) {
        html += '<div style="margin-top:12px"><button class="quiet" id="sim-next" type="button">Continue ▸</button></div>';
      } else {
        html += '<div class="k" style="margin-top:16px;text-transform:uppercase;letter-spacing:1px">Your reply</div>';
        def.replies.forEach((reply, i) => {
          const pickedCls = picked === i ? " picked" : "";
          html += '<div class="reply-card' + pickedCls + '" data-i="' + i + '"><div class="k"><span class="tone" style="background:var(--tone-' + reply.tone + ')"></span>' + reply.tone + "</div><div class=\\"say\\">" + render(reply.text) + "</div></div>";
          if (picked === i) {
            let out = "<b>" + commitmentLine(reply.commitment) + "</b>";
            if (reply.commitment.kind === "position") out += '<div class="k" style="margin-top:6px">The board remembers: “' + render(reply.commitment.remembered) + "”</div>";
            if (reply.press) out += '<div class="k" style="margin-top:4px">Press: “' + render(reply.press) + "”</div>";
            if (reply.sets && reply.sets.length) out += '<div class="k" style="margin-top:4px">Sets flags: ' + reply.sets.join(", ") + "</div>";
            html += '<div class="outcome">' + out + "</div>";
          }
        });
      }
      stage.innerHTML = html;
      const next = document.getElementById("sim-next");
      if (next) next.onclick = () => { revealed++; draw(); };
      stage.querySelectorAll(".reply-card").forEach((el) => {
        el.onclick = () => { picked = Number(el.dataset.i); draw(); };
      });
    }

    document.getElementById("sim-reset").onclick = () => { revealed = 1; picked = null; draw(); };
    [pickCounterpart, leaderInput, titleInput].forEach((el) => el.addEventListener("input", draw));
    draw();
  })();
  </script>`;
}

/**
 * The full reader page for one scenario, wherever it lives (job output or
 * shipped pack). Callers supply the chrome around it: breadcrumb, active nav
 * item, and any admin actions.
 */
export function scenarioReaderPage(def, { crumb, active, adminHtml, nations, effectsHtml, title }) {
  const conditions = def.conditions.length ? def.conditions.map(formatCondition).map(esc).join(" · ") : "always live";
  const particulars = (def.particulars ?? [])
    .map((p) => `<div class="tile"><div class="v" style="font-size:15px">${esc(p.value)}</div><div class="l">${esc(p.label)}</div></div>`)
    .join("");
  const locus = def.locus
    ? `<p class="k">Locus: <b>${esc(def.locus.site)}</b>${def.locus.ground ? ` (${esc(def.locus.ground)})` : ""} — ${esc(def.locus.descriptor)}</p>`
    : "";
  const sortedReplies = [...def.replies].sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone));
  const toneRow = sortedReplies.map((r) => `${toneDot(r.tone)}<span class="k">${esc(r.tone)}</span>`).join(" &nbsp; ");

  // A subject carries tokens until it is cast; the cast one reads as a player sees it.
  const heading = title ?? def.subject;
  return shell(
    heading,
    `<div class="crumb">${crumb}</div>
<div class="pagehead"><h1>${esc(heading)}</h1><code>${esc(def.id)}</code></div>
<div>${metaChips(def)}</div>
<p class="k">Conditions: ${conditions}</p>
${locus}
${particulars ? `<div class="tiles" style="max-width:640px">${particulars}</div>` : ""}
<div style="margin:6px 0 14px">${toneRow}</div>

${effectsHtml ?? ""}

<h2>Play it</h2>
${simulator(def, nations)}

<h2>Decision tree</h2>
${treeView(def)}
${adminHtml ?? ""}`,
    { active },
  );
}
