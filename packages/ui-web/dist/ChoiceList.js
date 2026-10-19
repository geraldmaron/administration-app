import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Icon } from "./Icon";
const BAND_TICKS = { [-3]: "Major fall", 0: "None", 3: "Major rise" };
/** A round step that puts the axis's end at or past `span`. */
function niceCeil(span) {
    if (span <= 0)
        return 0;
    const power = 10 ** Math.floor(Math.log10(span));
    const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= span);
    return step * power;
}
const signedTick = (value) => (value === 0 ? "0" : `${value > 0 ? "+" : "−"}${Math.abs(value)}`);
/**
 * The one axis every move in `unit` is drawn on, sized to the likely moves so
 * a move of a point reads as a bar and not a speck. A good or bad case past
 * the end is clipped there and marked; its figure is in the worst-case line.
 * Where moves go both ways the axis is even about zero, so a rise and a fall
 * of the same size draw the same length.
 */
export function choiceAxis(effects, unit) {
    const values = effects.filter((effect) => effect.unit === unit).map((effect) => effect.value);
    const reach = niceCeil(Math.max(0, ...values.map(Math.abs)));
    const low = values.some((value) => value < 0) ? -reach : 0;
    const high = values.some((value) => value > 0) ? reach : 0;
    if (unit === "band") {
        return { unit, lo: -3, hi: 3, ticks: [-3, 0, 3].map((at) => ({ at, label: BAND_TICKS[at] })) };
    }
    const lo = low < 0 ? -niceCeil(-low) : 0;
    const hi = niceCeil(high) || (lo === 0 ? 1 : 0);
    const ticks = [lo, 0, hi].filter((at, index, all) => all.indexOf(at) === index);
    return { unit, lo, hi, ticks: ticks.map((at) => ({ at, label: at === hi && unit ? `${signedTick(at)} ${unit}` : signedTick(at) })) };
}
const at = (axis, value) => (axis.hi === axis.lo ? 50 : ((Math.min(axis.hi, Math.max(axis.lo, value)) - axis.lo) / (axis.hi - axis.lo)) * 100);
const pct = (value) => `${value.toFixed(2)}%`;
const VALENCE = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" };
const VERDICT = { good: ", in your favor", bad: ", against you", watch: ", worth watching", neutral: "" };
function spokenEffect(effect) {
    const range = effect.ifWell !== undefined && effect.ifBadly !== undefined ? `; ${signedTick(effect.ifWell)} if it goes well, ${signedTick(effect.ifBadly)} if badly` : "";
    return `${effect.label}: ${effect.text} likely${range}${VERDICT[VALENCE[effect.tone]]}`;
}
/** One move as a slim bar from the zero line on the shared axis, its good-to-bad range as a hairline behind it. */
function EffectLine({ effect, axis }) {
    const zero = at(axis, 0);
    const end = at(axis, effect.value);
    const ranged = effect.ifWell !== undefined && effect.ifBadly !== undefined;
    const lowCase = ranged ? Math.min(effect.ifWell, effect.ifBadly) : 0;
    const highCase = ranged ? Math.max(effect.ifWell, effect.ifBadly) : 0;
    const from = at(axis, lowCase);
    const to = at(axis, highCase);
    const clipped = ranged && (lowCase < axis.lo || highCase > axis.hi);
    return (_jsxs("div", { className: "ui-choice__effect", "data-valence": VALENCE[effect.tone], role: "img", "aria-label": spokenEffect(effect), children: [_jsx("span", { className: "ui-choice__metric", "aria-hidden": "true", children: effect.label }), _jsxs("span", { className: "ui-choice__track", "data-unit": effect.unit, "aria-hidden": "true", style: { "--choice-zero": pct(zero) }, children: [ranged ? _jsx("span", { className: "ui-choice__range", "data-clip-start": flag(lowCase < axis.lo), "data-clip-end": flag(highCase > axis.hi), "data-clipped": flag(clipped), style: { insetInlineStart: pct(from), inlineSize: pct(to - from) } }) : null, effect.unit === "band" ? _jsx("span", { className: "ui-choice__steps", children: [-3, -2, -1, 1, 2, 3].map((step) => _jsx("span", { "data-active": flag(effect.value < 0 ? step < 0 && step >= effect.value : step > 0 && step <= effect.value) }, step)) }) : _jsx("span", { className: "ui-choice__bar", "data-zero": flag(effect.value === 0), style: { insetInlineStart: pct(Math.min(zero, end)), inlineSize: pct(Math.abs(end - zero)) } })] }), _jsx("span", { className: "ui-choice__fig", "aria-hidden": "true", children: effect.text })] }));
}
/** The axis's labeled ends and zero, set once over the effects column on the same grid as every effect line. */
function AxisHead({ axis }) {
    return (_jsxs("span", { className: "ui-choice__axis", "aria-hidden": "true", children: [_jsx("span", { className: "ui-choice__metric", children: "Likely effect" }), _jsx("span", { className: "ui-choice__ticks", children: axis.ticks.map((tick) => (_jsx("span", { className: "ui-choice__tick", "data-edge": tick.at === axis.lo ? "start" : tick.at === axis.hi ? "end" : undefined, style: { insetInlineStart: pct(at(axis, tick.at)) }, children: tick.label }, tick.at))) }), _jsx("span", { className: "ui-choice__fig" })] }));
}
function Odds({ odds }) {
    const percent = Math.round(odds.share * 100);
    const valence = odds.share >= 0.6 ? "good" : odds.share >= 0.4 ? "watch" : "bad";
    return (_jsxs("span", { className: "ui-choice__odds", "data-valence": valence, children: [_jsx("span", { className: "ui-visually-hidden", children: "Chance it goes well: " }), _jsx("span", { className: "ui-choice__share", "aria-hidden": "true", style: { "--choice-share": odds.share } }), _jsxs("strong", { className: "ui-choice__percent", children: [percent, "% ", _jsx("span", { className: "ui-choice__word", children: odds.word })] }), odds.confidence ? _jsxs("span", { className: "ui-choice__confidence", children: [odds.confidence, " confidence"] }) : null] }));
}
function Cost({ cost }) {
    const free = !cost.borrowing && cost.figure === undefined && cost.text === "Free";
    const valence = cost.figure && cost.figure.value > 0 ? "good" : undefined;
    return (_jsxs("span", { className: "ui-choice__money", "data-free": free ? "true" : undefined, ...(valence ? { "data-valence": valence } : {}), children: [cost.borrowing && cost.text === "Free" ? "No authority spent" : cost.text, cost.borrowing ? _jsxs("span", { className: "ui-choice__borrowing", children: [_jsx("span", { children: "Borrowing" }), _jsx("strong", { children: cost.borrowing.text })] }) : null] }));
}
/** A cost every option shares is not a difference between them, so it is said once rather than on every row. */
function costsDiffer(items) {
    if (items.some((item) => item.cost !== undefined || item.outcome?.cost.borrowing !== undefined))
        return true;
    const texts = new Set(items.flatMap((item) => (item.outcome ? [item.outcome.cost.figure ? `#${item.outcome.cost.figure.value}` : item.outcome.cost.text] : [])));
    return texts.size > 1;
}
function sharedCost(items) {
    if (costsDiffer(items))
        return undefined;
    return items.find((item) => item.outcome)?.outcome?.cost.text;
}
function columnsOf(items) {
    return {
        cost: costsDiffer(items),
        odds: items.some((item) => item.outcome?.odds !== undefined || item.odds !== undefined),
        effects: items.some((item) => (item.outcome?.effects.length ?? 0) > 0),
    };
}
/** The axes a list draws on, one per unit its moves are in, the most used first so the header labels it. */
function axesOf(items) {
    const effects = items.flatMap((item) => item.outcome?.effects ?? []);
    const units = [...new Set(effects.map((effect) => effect.unit))].sort((a, b) => effects.filter((e) => e.unit === b).length - effects.filter((e) => e.unit === a).length);
    return new Map(units.map((unit) => [unit, choiceAxis(effects, unit)]));
}
/** The common scale and monetary basis stay visible above the options. */
function Head({ columns, axis, shared }) {
    if (!(columns.effects && axis) && !shared)
        return null;
    return _jsxs("div", { className: "ui-choice__head", children: [shared ? _jsx("span", { className: "ui-choice__shared", children: shared === "Free" ? "No monetary cost for any option" : `Every option costs ${shared} now` }) : null, columns.effects && axis ? _jsx(AxisHead, { axis: axis }) : null, axis?.unit === "band" ? _jsx("span", { className: "ui-choice__scale-note", children: "Qualitative magnitude \u00B7 three steps each direction" }) : null] });
}
const flag = (on) => (on ? "true" : undefined);
function Name({ item, name, selected, onSelect }) {
    const lockId = item.lockShared ? `${name}-locked` : `${name}-${item.id}-locked`;
    const look = item.icon ?? (item.baseline ? "schedule" : undefined);
    return (_jsxs("div", { className: "ui-choice__name", children: [_jsxs("label", { className: "ui-compare__pick ui-row-link", children: [_jsx("span", { id: `${name}-${item.id}-name`, children: item.label }), _jsx("input", { type: "radio", name: `${name}-pick`, checked: selected, onChange: () => onSelect(item.id), ...(item.unavailable ? { "aria-describedby": lockId } : {}) })] }), item.mark ? _jsx("span", { className: "ui-choice__emblem", children: item.mark }) : look ? _jsx("span", { className: "ui-choice__emblem", "data-accent": item.accent ?? "neutral", children: _jsx(Icon, { name: look, size: 18 }) }) : null, item.baseline || item.recommended ? (_jsxs("span", { className: "ui-choice__flags", children: [item.baseline ? _jsx("span", { className: "ui-choice__flag", children: "Default" }) : null, item.recommended ? _jsx("span", { className: "ui-choice__flag", "data-recommended": "true", children: "Recommended" }) : null] })) : null, item.lead ? _jsx("span", { className: "ui-choice__lead", children: item.lead }) : null, item.unavailable && !item.lockShared ? (_jsxs("span", { className: "ui-compare__locked ui-choice__locked", id: lockId, children: [_jsx(Icon, { name: "locked", size: 14 }), _jsx("span", { children: item.unavailable })] })) : item.unavailable ? (_jsxs("span", { className: "ui-choice__locked", children: [_jsx(Icon, { name: "locked", size: 14 }), " Locked"] })) : null, !item.outcome && item.verdict && item.verdict.length > 0 ? (_jsx("span", { className: "ui-choice__verdict", children: item.verdict.map((entry) => (_jsxs("span", { className: "ui-valence-chip", "data-valence": entry.valence, children: [entry.icon ? _jsx(Icon, { name: entry.icon, size: 14 }) : null, entry.text] }, entry.text))) })) : null] }));
}
function Effects({ outcome, axes }) {
    if (!outcome)
        return _jsx("div", { className: "ui-choice__effects" });
    if (outcome.effects.length === 0)
        return _jsx("div", { className: "ui-choice__effects", children: _jsx("span", { className: "ui-choice__quiet", children: outcome.baseline ? "Nothing moves now" : "No change expected" }) });
    return (_jsx("div", { className: "ui-choice__effects", children: outcome.effects.map((effect) => (_jsx(EffectLine, { effect: effect, axis: axes.get(effect.unit) }, effect.metric))) }));
}
function Detail({ item }) {
    const lines = item.outcome ? item.outcome.details.map((line) => ({ label: line.label, value: line.text, ...(line.icon ? { icon: line.icon } : {}) })) : (item.detail ?? []);
    if (lines.length === 0)
        return null;
    return (_jsx("dl", { className: "ui-choice__detail", children: lines.map((line) => (_jsxs("div", { className: "ui-choice__line", children: [_jsxs("dt", { children: [line.icon ? _jsx(Icon, { name: line.icon, size: 16 }) : null, line.label] }), _jsx("dd", { children: line.value })] }, line.label))) }));
}
function Row({ item, name, columns, axes, selected, onSelect, projection, baselineEffects }) {
    const projected = projection?.perItem[item.id];
    const odds = item.outcome?.odds;
    const worst = item.outcome?.worstCase ?? item.worst;
    return (_jsxs("div", { className: "ui-choice__row ui-compare__card ui-row-target", "data-selected": flag(selected), "data-baseline": flag(item.baseline), "data-locked": flag(item.unavailable !== undefined), children: [_jsx(Name, { item: item, name: name, selected: selected, onSelect: onSelect }), columns.cost ? _jsx("div", { className: "ui-choice__cost", "data-label": item.outcome?.cost.borrowing ? "Authority / borrowing" : "Cost now", children: item.outcome ? _jsx(Cost, { cost: item.outcome.cost }) : item.cost }) : null, columns.odds ? (_jsx("div", { className: "ui-choice__chance", "data-label": item.oddsLabel ?? "Odds", children: odds ? _jsx(Odds, { odds: odds }) : item.outcome ? _jsx("span", { className: "ui-choice__quiet", children: "Certain" }) : item.odds !== undefined ? _jsxs(_Fragment, { children: [_jsxs("span", { className: "ui-visually-hidden", children: [item.oddsLabel ?? "Odds", ": "] }), item.odds] }) : null })) : null, columns.effects ? _jsx(Effects, { outcome: item.baseline && item.outcome && item.outcome.effects.length === 0 ? { ...item.outcome, effects: baselineEffects } : item.outcome, axes: axes }) : null, worst ? (
            // A div, not a paragraph: the worst case can carry a drawn reading, and a
            // gauge's block element inside a <p> is invalid markup the browser
            // silently re-parents.
            _jsxs("div", { className: "ui-choice__worst", "data-under": columns.effects ? "effects" : "row", children: [_jsx("span", { className: "ui-choice__worst-label", children: item.baseline ? "Baseline outcome" : "Downside scenario" }), _jsx("span", { className: "ui-choice__worst-text", children: worst })] })) : null, projected ? (_jsx("div", { className: "ui-choice__projected", "data-under": columns.effects ? "effects" : "row", children: projected })) : null] }));
}
/**
 * The options as a results list: doing nothing on top as the reference, each
 * option one row whose whole width is its radio (arrow keys move the pick),
 * the picked row open to everything else. The price, the odds, the moves and
 * the worst case never fold away.
 */
export function ChoiceList({ labeledBy, name, items, selected, onSelect, projection, footer }) {
    const ordered = [...items.filter((item) => item.baseline), ...items.filter((item) => !item.baseline)];
    const columns = columnsOf(ordered);
    const axes = axesOf(ordered);
    const primary = axes.values().next().value;
    const picked = ordered.find((item) => item.id === selected);
    const compared = ordered.flatMap((item) => item.outcome?.effects ?? []);
    const baselineEffects = compared.filter((effect, index) => compared.findIndex((entry) => entry.metric === effect.metric) === index).map((effect) => ({ metric: effect.metric, label: effect.label, unit: effect.unit, value: 0, text: effect.unit === "band" ? "Unchanged" : `0 ${effect.unit}`, tone: "neutral" }));
    return (_jsxs(_Fragment, { children: [projection ? _jsx("div", { className: "ui-choice__projection-control", children: projection.control }) : null, _jsxs("div", { className: "ui-choice", role: "radiogroup", "aria-labelledby": labeledBy, children: [_jsx(Head, { columns: columns, axis: primary, shared: sharedCost(ordered) }), _jsx("div", { className: "ui-choice__comparisons", children: ordered.map((item) => _jsx(Row, { item: item, name: name, columns: columns, axes: axes, selected: item.id === selected, onSelect: onSelect, projection: projection, baselineEffects: baselineEffects }, item.id)) })] }), footer, picked ? _jsx("div", { className: "ui-choice__evidence", children: _jsx(Detail, { item: picked }) }) : null, projection?.detail ? _jsx("div", { className: "ui-choice__projection-detail", children: projection.detail }) : null] }));
}
