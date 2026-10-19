import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrandGlyph } from "./BrandGlyph";
const STATE_WORDS = {
    draft: "Draft",
    pending: "Pending",
    signed: "Signed",
    issued: "Issued",
    "in-effect": "In effect",
    challenged: "Challenged in court",
    stayed: "Stayed",
    expired: "Expired",
    revoked: "Revoked",
    vetoed: "Vetoed",
};
const STATE_TONE = {
    draft: "pending",
    pending: "pending",
    signed: "success",
    issued: "success",
    "in-effect": "success",
    challenged: "warning",
    stayed: "warning",
    expired: "unknown",
    revoked: "danger",
    vetoed: "danger",
};
/**
 * A presidential instrument as paper: issuer, kind, title, reference, date,
 * state, numbered operative sections and the signature block. A draft is
 * marked as one throughout, so an unsigned page never reads as issued.
 */
export function Document({ issuer, kind, title, reference, dated, state, stateLabel, sections, signature, children }) {
    return (_jsxs("article", { className: "ui-document", "data-state": state, "aria-label": `${kind}: ${title}`, children: [_jsxs("header", { className: "ui-document__head", children: [_jsxs("div", { className: "ui-document__issuer", children: [_jsx(BrandGlyph, { size: 32, className: "ui-document__seal" }), _jsx("span", { children: issuer })] }), _jsx("p", { className: "ui-document__kind", children: kind }), _jsx("h2", { className: "ui-document__title", children: title }), _jsxs("dl", { className: "ui-document__meta", children: [reference ? (_jsxs("div", { children: [_jsx("dt", { children: "Reference" }), _jsx("dd", { children: reference })] })) : null, _jsxs("div", { children: [_jsx("dt", { children: "Date" }), _jsx("dd", { children: dated })] }), _jsxs("div", { children: [_jsx("dt", { children: "Status" }), _jsx("dd", { children: _jsx("span", { className: `ui-document__state ui-document__state--${STATE_TONE[state]}`, children: stateLabel ?? STATE_WORDS[state] }) })] })] })] }), _jsx("ol", { className: "ui-document__sections", children: sections.map((section, index) => (_jsxs("li", { className: "ui-document__section", children: [_jsxs("h3", { className: "ui-document__heading", children: [_jsxs("span", { className: "ui-document__number", children: ["Sec. ", index + 1, "."] }), " ", section.heading] }), _jsx("div", { className: "ui-document__body", children: section.body })] }, section.heading))) }), children, signature ? (_jsxs("footer", { className: "ui-document__signature", "data-signed": signature.signed || undefined, children: [_jsx("span", { className: "ui-document__line", children: signature.signed ? signature.name : "Not yet signed" }), _jsxs("span", { className: "ui-document__signer", children: [signature.name, ", ", signature.title] })] })) : null] }));
}
