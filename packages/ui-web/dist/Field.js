import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NativeSelect } from "./NativeSelect";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useId, useLayoutEffect, useRef, useState } from "react";
/** A label, the control it names, and the hint and error that describe it. */
export function Field({ label, hint, error, className, children }) {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
    return (_jsxs("div", { className: ["ui-field", className].filter(Boolean).join(" "), "data-invalid": error ? "true" : undefined, children: [_jsx(LabelPrimitive.Root, { className: "ui-field__label", htmlFor: id, children: label }), children({ id, ...(describedBy ? { "aria-describedby": describedBy } : {}), ...(error ? { "aria-invalid": true } : {}) }), hint ? (_jsx("p", { id: hintId, className: "ui-field__hint", children: hint })) : null, error ? (_jsx("p", { id: errorId, className: "ui-field__error", role: "alert", children: error })) : null] }));
}
/** Measure the actual labels, including font/zoom changes, before choosing a compact control. */
function useCompactChoice(enabled, options) {
    const row = useRef(null);
    const select = useRef(null);
    const [compact, setCompact] = useState(false);
    const transferFocus = useRef(false);
    useLayoutEffect(() => {
        const element = row.current;
        if (!enabled || !element)
            return;
        const measure = () => {
            const next = element.scrollWidth > element.clientWidth + 1;
            transferFocus.current = element.contains(document.activeElement) || document.activeElement === select.current;
            setCompact(next);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        for (const label of element.querySelectorAll('.ui-choice__label'))
            observer.observe(label);
        return () => observer.disconnect();
    }, [enabled, options]);
    useLayoutEffect(() => {
        if (!transferFocus.current)
            return;
        if (compact)
            select.current?.focus({ preventScroll: true });
        else {
            const options = row.current;
            (options?.querySelector('input:checked') ?? options?.querySelector('input:not(:disabled)'))?.focus({ preventScroll: true });
        }
        transferFocus.current = false;
    }, [compact]);
    return { row, select, compact: enabled && compact };
}
/** Segments remain one row; when the labels do not fit, the same choice uses a native select. */
export function Choice({ legend, options, value, onChange, hint, layout = "segments", className, appearance = "plain" }) {
    const name = useId();
    const { row, select, compact } = useCompactChoice(layout === "segments" && options.every((option) => typeof option.label === "string"), options);
    return (_jsxs("fieldset", { className: ["ui-choice", `ui-choice--${layout}`, className].filter(Boolean).join(" "), "data-compact": compact || undefined, "data-appearance": appearance, children: [_jsx("legend", { id: `${name}-legend`, className: "ui-field__label", children: legend }), hint ? _jsx("p", { id: `${name}-hint`, className: "ui-field__hint", children: hint }) : null, compact ? _jsxs(NativeSelect, { ref: select, "aria-labelledby": `${name}-legend`, "aria-describedby": hint ? `${name}-hint` : undefined, value: value ?? "", onChange: (event) => onChange(event.target.value), children: [value === undefined ? _jsx("option", { value: "", disabled: true, children: "Choose an option" }) : null, options.map((option) => _jsx("option", { value: option.value, children: option.label }, option.value))] }) : null, _jsx("div", { ref: row, className: "ui-choice__options", "aria-hidden": compact || undefined, inert: compact || undefined, children: options.map((option) => (_jsxs("label", { className: "ui-choice__option", "data-checked": option.value === value ? "true" : undefined, title: layout === "swatches" && typeof option.label === "string" ? option.label : undefined, children: [_jsx("input", { type: "radio", name: name, value: option.value, checked: option.value === value, onChange: (event) => onChange(event.target.value) }), option.swatch ? _jsx("span", { className: "ui-choice__swatch", style: { background: option.swatch }, "aria-hidden": "true" }) : null, option.visual ? _jsx("span", { className: "ui-choice__visual", "aria-hidden": "true", children: option.visual }) : null, _jsx("span", { className: layout === "swatches" ? "ui-choice__label ui-visually-hidden" : "ui-choice__label", children: option.label }), option.detail ? _jsx("span", { className: "ui-choice__detail", children: option.detail }) : null] }, option.value))) })] }));
}
/** An on-off setting, as a switch a screen reader announces as one. */
export function Toggle({ label, checked, onChange, hint }) {
    const id = useId();
    return (_jsxs("div", { className: "ui-toggle", children: [_jsx(SwitchPrimitive.Root, { id: id, className: "ui-switch", checked: checked, onCheckedChange: onChange, "aria-describedby": hint ? `${id}-hint` : undefined, children: _jsx(SwitchPrimitive.Thumb, { className: "ui-switch__thumb" }) }), _jsx(LabelPrimitive.Root, { htmlFor: id, className: "ui-toggle__label", children: label }), hint ? (_jsx("p", { id: `${id}-hint`, className: "ui-field__hint", children: hint })) : null] }));
}
