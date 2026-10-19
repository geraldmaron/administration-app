import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { ChoiceList } from "./ChoiceList";
import { Icon } from "./Icon";
import { useSurfaceFoot } from "./WorkSurface";
/** The baseline column where there is one, or a thrown error when two options both claim to do nothing. */
export function baselineOf(options) {
    const baselines = options.filter((option) => option.baseline);
    if (baselines.length > 1) {
        throw new Error(`A comparison takes at most one do-nothing baseline; this one has ${baselines.length}.`);
    }
    return baselines[0];
}
const flag = (on) => (on ? "true" : undefined);
/** The one reason every locked option shares, where two or more are locked for it; otherwise each row says its own. */
function sharedLockOf(options) {
    const reasons = options.flatMap((option) => (option.unavailable === undefined ? [] : [option.unavailable]));
    return reasons.length >= 2 && reasons.every((reason) => reason === reasons[0]) ? reasons[0] : undefined;
}
// A screen that still hands over rows of drawn cells has its price, its odds
// and its worst case lifted into the list's columns by the row's own name, so
// they stay in view on every row; everything else waits in the opened row.
const COST_ROW = /\bcosts?\b/i;
const NOT_COST = /priced|basis|how the cost/i;
const ODDS_ROW = /chance|odds|how likely|would they (accept|sign)|says yes/i;
const WORST_ROW = /goes wrong|goes badly|could go wrong|^risks?$|^the risk$|if they decline/i;
function promoted(rows) {
    const lead = rows.find((row) => row.kind === "lead");
    const reading = rows.filter((row) => row.kind !== "lead");
    const cost = reading.find((row) => COST_ROW.test(row.label) && !NOT_COST.test(row.label));
    const odds = reading.find((row) => ODDS_ROW.test(row.label));
    const worst = reading.find((row) => WORST_ROW.test(row.label));
    return { ...(lead ? { lead } : {}), ...(cost ? { cost } : {}), ...(odds ? { odds } : {}), ...(worst ? { worst } : {}) };
}
const none = _jsx("span", { className: "ui-compare__none", children: "Does not apply" });
/** One option as a row of the results list: its outcome where the screen has one, otherwise its rows with the price, odds and worst case lifted out. */
function itemOf(option, rows, lift, sharedLock) {
    const cellOf = (row) => (row ? (row.cells[option.id] ?? none) : undefined);
    const head = {
        id: option.id,
        label: option.label,
        ...(option.icon ? { icon: option.icon } : {}),
        ...(option.accent ? { accent: option.accent } : {}),
        ...(option.mark ? { mark: option.mark } : {}),
        ...(option.baseline ? { baseline: true } : {}),
        ...(option.recommended ? { recommended: true } : {}),
        ...(option.unavailable ? { unavailable: option.unavailable, lockShared: option.unavailable === sharedLock } : {}),
    };
    if (option.outcome)
        return { ...head, outcome: option.outcome };
    const lifted = new Set([lift.lead, lift.cost, lift.odds]);
    return {
        ...head,
        ...(option.verdict ? { verdict: option.verdict } : {}),
        ...(lift.lead ? { lead: cellOf(lift.lead) } : {}),
        ...(lift.cost ? { cost: cellOf(lift.cost) } : {}),
        ...(lift.odds ? { odds: cellOf(lift.odds), oddsLabel: lift.odds.label } : {}),
        ...(lift.worst ? { worst: cellOf(lift.worst) } : {}),
        detail: rows.filter((row) => !lifted.has(row)).map((row) => ({ label: row.label, ...(row.icon ? { icon: row.icon } : {}), value: row.cells[option.id] ?? none })),
    };
}
/**
 * Every consequential act: the options side by side, one picked, what it
 * will do in a line, and one named verb. The verb stays off while nothing or
 * the baseline is picked, because doing nothing needs no signature.
 */
export function CompareAuthorize({ title, options, rows, selected, onSelect, verb, onAuthorize, tone = "commit", review, baselineReview, busy = false, docked = false, footnote, projection }) {
    const id = useId();
    const foot = useSurfaceFoot();
    const baseline = baselineOf(options);
    const picked = options.find((option) => option.id === selected);
    const acting = picked !== undefined && !picked.baseline;
    const locked = picked?.unavailable;
    const inFoot = docked && foot !== null;
    const sharedLock = sharedLockOf(options);
    const lift = promoted(rows);
    const items = options.map((option) => itemOf(option, rows, lift, sharedLock));
    const act = (_jsxs("div", { className: "ui-compare__act", ...(inFoot ? { role: "group", "aria-labelledby": `${id}-title` } : {}), children: [_jsx("p", { id: `${id}-review`, className: "ui-compare__review", "aria-live": "polite", children: _jsx("span", { children: locked ?? (acting ? review : (baselineReview ?? (baseline ? `${baseline.label} is picked. Nothing changes.` : "Pick an option to read what it does."))) }) }), _jsx(Button, { kind: tone, disabled: !acting || locked !== undefined, busy: busy, "aria-describedby": `${id}-review`, onClick: () => {
                    if (selected !== undefined)
                        projection?.onAuthorize?.(selected);
                    onAuthorize();
                }, children: verb })] }));
    return (_jsxs("section", { className: "ui-compare", "data-docked": flag(docked), "aria-labelledby": `${id}-title`, children: [_jsx("h3", { id: `${id}-title`, className: "ui-compare__title", children: title }), sharedLock ? (_jsxs("p", { className: "ui-compare__locked ui-compare__locked--shared", id: `${id}-locked`, children: [_jsx(Icon, { name: "locked", size: 16 }), _jsxs("span", { children: [_jsx("strong", { children: "Locked." }), " ", sharedLock] })] })) : null, _jsx(ChoiceList, { labeledBy: `${id}-title`, name: id, items: items, selected: selected ?? "", onSelect: onSelect, footer: _jsxs(_Fragment, { children: [footnote ? _jsx("div", { className: "ui-compare__footnote", children: footnote }) : null, inFoot ? createPortal(act, foot) : act] }), ...(projection ? { projection } : {}) })] }));
}
