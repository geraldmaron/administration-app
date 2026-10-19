import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A chamber's seats as one bar split by party, with the majority line drawn
 * on it. Each party's count is printed beside its name, so color is never the
 * only way to tell the parties apart.
 */
export function PartyBar({ label, parties, majority, verdict }) {
    const total = parties.reduce((sum, party) => sum + party.seats, 0) || 1;
    const spoken = parties.map((party) => `${party.label} ${party.seats}`).join(", ");
    return (_jsxs("figure", { className: "ui-party-bar", children: [_jsx("figcaption", { className: "ui-party-bar__label", children: label }), _jsxs("div", { className: "ui-party-bar__track", role: "img", "aria-label": `${label}: ${spoken} of ${total}${majority ? `; ${majority} for a majority` : ""}.`, children: [parties.map((party) => party.seats > 0 ? _jsx("span", { className: "ui-party-bar__segment", "data-party": party.party, style: { flexGrow: party.seats } }, party.party) : null), majority ? _jsx("span", { className: "ui-party-bar__majority", style: { insetInlineStart: `${(majority / total) * 100}%` } }) : null] }), _jsxs("ul", { className: "ui-party-bar__legend", "aria-hidden": "true", children: [parties.map((party) => (_jsxs("li", { "data-party": party.party, children: [_jsx("span", { className: "ui-party-bar__swatch" }), party.label, " ", _jsx("strong", { children: party.seats })] }, party.party))), majority ? _jsxs("li", { className: "ui-party-bar__need", children: [majority, " for a majority"] }) : null] }), verdict ? _jsx("p", { className: "ui-party-bar__verdict", children: verdict }) : null] }));
}
