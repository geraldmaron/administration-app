import { esc } from "./view.mjs";

// What each reply does on a board where the scenario is live, as the engine
// commits it (`previewScenario` in @admin/content). The authored cost is only
// what a writer typed; this section is the board before and after.

// Readings where a rise is bad news for the President. Everything else on the
// board reads better when it goes up.
const WORSE_WHEN_HIGHER = new Set(["tension", "polarization"]);

const MONEY = new Set(["treasury"]);

function figure(key, value) {
  if (MONEY.has(key) || key.includes("$M")) return `$${Math.round(value).toLocaleString("en-US")}M`;
  return Math.abs(value) >= 10 ? Math.round(value).toLocaleString("en-US") : value.toFixed(3);
}

function changeRow(change) {
  const delta = change.after - change.before;
  const better = WORSE_WHEN_HIGHER.has(change.key) ? delta < 0 : delta > 0;
  const sign = delta > 0 ? "+" : "−";
  const shown = MONEY.has(change.key) || change.key.includes("$M")
    ? `${sign}$${Math.abs(Math.round(delta)).toLocaleString("en-US")}M` : `${sign}${Math.abs(delta).toFixed(3)}`;
  return `<tr><td>${esc(change.key)}</td><td class="num">${esc(figure(change.key, change.before))}</td>
    <td class="num">${esc(figure(change.key, change.after))}</td>
    <td class="num" style="color:var(${better ? "--good" : "--bad"})">${esc(shown)}</td></tr>`;
}

function changeTable(title, rows) {
  if (rows.length === 0) return "";
  return `<div class="k" style="margin-top:8px">${esc(title)}</div>
  <div class="wrap"><table><tr><th>Reading</th><th>Before</th><th>After</th><th>Change</th></tr>${rows.map(changeRow).join("")}</table></div>`;
}

function measureLine(verb, measure) {
  const law = measure.statute ? ` under ${measure.statute}` : "";
  const whose = measure.origin === "us" ? "U.S. tariff" : "their tariff";
  return `<div>${esc(verb)}: ${esc(whose)} on ${esc(measure.sector)} (${esc(measure.target)}) at ${Math.round(measure.rate * 100)}%${esc(law)} <code class="k">${esc(measure.id)}</code></div>`;
}

function quotedLine(quoted) {
  const entries = Object.entries(quoted).filter(([, value]) => value !== 0);
  if (entries.length === 0) return "nothing quoted";
  return entries.map(([key, value]) => `${key} ${value > 0 ? "+" : "−"}${MONEY.has(key) ? `$${Math.abs(Math.round(value)).toLocaleString("en-US")}M` : Math.abs(value).toFixed(3)}`).join(", ");
}

function replyCard(reply) {
  if (!reply.available) {
    return `<div class="node"><b>${esc(reply.tone)}</b> · <code>${esc(reply.replyId)}</code>
      <div style="margin-top:5px">${esc(reply.text)}</div>
      <div style="margin-top:6px;color:var(--warn)">Refused on this board: ${esc(reply.refusal ?? "")}</div></div>`;
  }
  const trade = [...reply.imposed.map((m) => measureLine("Imposed", m)), ...reply.lifted.map((m) => measureLine("Lifted", m))].join("");
  const effects = reply.effects.map((effect) => `<li><b>${esc(effect.kind)}</b> <span class="k">${esc(effect.detail)}</span></li>`).join("");
  return `<div class="node"><b>${esc(reply.tone)}</b> · <code>${esc(reply.replyId)}</code>
    <div style="margin-top:5px">${esc(reply.text)}</div>
    <div class="k" style="margin-top:6px">Quoted before the choice: ${esc(quotedLine(reply.quoted))}</div>
    ${changeTable("The President's metrics", reply.metrics)}
    ${changeTable("Public judgments", reply.opinion)}
    ${changeTable("Relationship with the counterpart", reply.relationship)}
    ${reply.customs ? changeTable("Customs", [reply.customs]) : ""}
    ${trade ? `<div class="k" style="margin-top:8px">Trade ledger</div>${trade}` : ""}
    ${reply.flagsSet.length ? `<div class="k" style="margin-top:8px">Flags set: ${esc(reply.flagsSet.join(", "))}</div>` : ""}
    ${reply.beats.length ? `<div class="k" style="margin-top:8px">What the room says</div>${reply.beats.map((beat) => `<div>${esc(beat)}</div>`).join("")}` : ""}
    <details style="margin-top:8px"><summary class="k">${reply.effects.length} effect(s) in the committed packet</summary><ul>${effects}</ul></details>
  </div>`;
}

/**
 * The section, with a picker for the live board and, on it, any counterpart
 * the scenario is live against. `action` is the page's own path so the picker
 * is a plain GET form.
 */
export function replyEffectsSection(preview, action, nations) {
  if (preview.boards.length === 0) {
    return `<h2>What each reply does</h2><p class="k">No board in the reachability spread has this scenario live, so no reply can be run. The audit reports it as unreachable.</p>`;
  }
  const boardOptions = preview.boards.map((board) =>
    `<option value="${board.index}" ${board.index === preview.board.index ? "selected" : ""}>${esc(board.seed)} · ${esc(board.counterpartName)}</option>`).join("");
  const counterpartOptions = nations.filter((nation) => nation.id !== "USA").map((nation) =>
    `<option value="${esc(nation.id)}" ${nation.id === preview.board.counterpart ? "selected" : ""}>${esc(nation.name)}</option>`).join("");
  return `<h2>What each reply does</h2>
<p class="k">Each reply is cast, projected and committed by the engine on a board where this scenario is live, then applied to a copy, and the board is compared before and after. An instrument's later resolution and anything the next turns bring are not in it; this is the moment of decision.</p>
<form method="get" action="${esc(action)}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
  <label class="k">board <select name="board">${boardOptions}</select></label>
  <label class="k">counterpart <select name="counterpart"><option value="">as cast</option>${counterpartOptions}</select></label>
  <button type="submit">Run</button>
  <span class="k">Cast against <b>${esc(preview.board.counterpartName)}</b> · ${preview.boards.length} live board(s). A counterpart the scenario is not live against keeps the cast one.</span>
</form>
<div class="card"><b>${esc(preview.subject ?? "")}</b>${preview.opening.map((beat) => `<div style="margin-top:6px">${esc(beat)}</div>`).join("")}</div>
<div class="tree"><div class="col" style="flex:1">${preview.replies.map(replyCard).join("")}</div></div>`;
}
