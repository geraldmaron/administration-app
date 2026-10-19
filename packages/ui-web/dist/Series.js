import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { EvidencePanel } from "./EvidencePanel";
const HEIGHT = 180;
const PAD = 8;
function usePlotWidth() {
    const ref = useRef(null);
    const [width, setWidth] = useState(240);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element || typeof ResizeObserver === "undefined")
            return;
        const measure = () => setWidth(Math.max(1, element.clientWidth));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    return { ref, width };
}
function plot(values, domain, width, height, positions) {
    const [low, high] = domain;
    const span = high - low || 1;
    const first = positions?.[0];
    const last = positions?.[values.length - 1];
    const dated = positions?.length === values.length && first !== undefined && last !== undefined && last > first && positions.every((at, i) => Number.isFinite(at) && (i === 0 || at >= positions[i - 1]));
    return values.map((value, index) => value === null || !Number.isFinite(value) ? null : {
        x: PAD + (dated ? (positions[index] - first) / (last - first) : index / Math.max(1, values.length - 1)) * (width - PAD * 2),
        y: height - PAD - ((Math.min(high, Math.max(low, value)) - low) / span) * (height - PAD * 2),
    });
}
function path(points, step = false) {
    let previous = false;
    return points.map((point) => {
        if (!point) {
            previous = false;
            return "";
        }
        const result = previous && step ? `H${point.x.toFixed(2)} V${point.y.toFixed(2)}` : `${previous ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        previous = true;
        return result;
    }).join(" ");
}
/** Close each known run independently: missing observations never become filled evidence. */
function areaPath(points, baseline) {
    const runs = [];
    for (const point of points) {
        if (!point) {
            runs.push([]);
            continue;
        }
        if (runs.length === 0)
            runs.push([]);
        runs[runs.length - 1].push(point);
    }
    return runs.filter((run) => run.length > 1).map((run) => `${path(run)} L${run[run.length - 1].x} ${baseline} L${run[0].x} ${baseline} Z`).join(" ");
}
function summary({ values, format, splitAt, splitLabel }) {
    const known = values.filter((value) => value !== null && Number.isFinite(value));
    if (known.length === 0)
        return "No known readings yet.";
    const missing = values.length - known.length;
    const inherited = splitAt !== undefined && splitAt > 0 ? ` The first ${splitAt} ${splitLabel ? `are ${splitLabel}` : "came before you"}.` : "";
    return `${known.length} reading${known.length === 1 ? "" : "s"}, from ${format(known[0])} to ${format(known[known.length - 1])}; lowest ${format(Math.min(...known))}, highest ${format(Math.max(...known))}.${missing ? ` ${missing} unknown observations shown as gaps.` : ""}${inherited}`;
}
function useReplay(index, count, choose) {
    const [playing, setPlaying] = useState(false);
    const restarting = useRef(false);
    useEffect(() => {
        if (!playing)
            return;
        if (restarting.current) {
            if (index !== 0)
                return;
            restarting.current = false;
        }
        if (index >= count - 1) {
            setPlaying(false);
            return;
        }
        const timer = window.setTimeout(() => choose(index + 1), 800);
        return () => window.clearTimeout(timer);
    }, [playing, index, count, choose]);
    useEffect(() => {
        const pause = () => { if (document.hidden)
            setPlaying(false); };
        document.addEventListener("visibilitychange", pause);
        return () => document.removeEventListener("visibilitychange", pause);
    }, []);
    return { playing, pause: () => { restarting.current = false; setPlaying(false); }, toggle: () => {
            if (!playing && index >= count - 1) {
                restarting.current = true;
                choose(0);
            }
            setPlaying((was) => !was);
        } };
}
function SeriesPlot({ values, domain = [0, 1], splitAt, reference, interactive, compact, format, variant, positions, index, detail }) {
    const { ref, width } = usePlotWidth();
    const gradient = useId();
    const height = detail ? compact ? 96 : HEIGHT : 64;
    const pts = plot(values, domain, width, height, positions);
    const selected = pts[index];
    const split = splitAt !== undefined ? Math.max(0, splitAt - 1) : -1;
    const after = split >= 0 ? pts.slice(split) : pts;
    const refY = reference ? plot([reference.value], domain, width, height)[0]?.y : undefined;
    return (_jsxs("div", { className: "ui-series__graph", children: [detail ? _jsxs("div", { className: "ui-series__domain", "aria-label": "Scale", children: [_jsx("span", { children: format(domain[1]) }), _jsx("span", { children: format(domain[0]) })] }) : null, _jsxs("svg", { ref: ref, className: "ui-series__plot", viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: gradient, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "currentColor", stopOpacity: ".24" }), _jsx("stop", { offset: "100%", stopColor: "currentColor", stopOpacity: ".02" })] }) }), detail ? [0, .5, 1].map((fraction) => _jsx("line", { className: "ui-series__grid", x1: 0, x2: width, y1: PAD + fraction * (height - PAD * 2), y2: PAD + fraction * (height - PAD * 2) }, fraction)) : null, variant === "area" ? _jsx("path", { className: "ui-series__area", fill: `url(#${gradient})`, d: areaPath(interactive ? pts.slice(0, index + 1) : after, height - PAD) }) : null, refY !== undefined ? _jsx("line", { className: "ui-series__reference", x1: 0, x2: width, y1: refY, y2: refY }) : null, split >= 0 ? _jsx("path", { className: "ui-series__line ui-series__line--before", d: path(pts.slice(0, split + 1), variant === "step") }) : null, interactive ? _jsx("path", { className: "ui-series__line ui-series__line--context", d: path(pts, variant === "step") }) : null, _jsx("path", { className: "ui-series__line", d: path(interactive ? pts.slice(0, index + 1) : after, variant === "step") }), interactive && selected ? _jsx("line", { className: "ui-series__cursor", x1: selected.x, x2: selected.x, y1: 0, y2: height }) : null, selected ? _jsx("circle", { className: "ui-series__now", cx: selected.x, cy: selected.y, r: 3 }) : null] })] }));
}
/** A responsive trend or a detailed recorded history; replay never advances simulation time. */
export function Series(props) {
    const { label, values, domain = [0, 1], reference, tone = "reading", format, unitLabel, timeRange, showDomain, labels, interactive, onIndexChange } = props;
    const id = useId();
    const detail = showDomain || interactive;
    const [localIndex, setLocalIndex] = useState(values.length - 1);
    const index = Math.max(0, Math.min(interactive ? props.selectedIndex ?? localIndex : values.length - 1, values.length - 1));
    const choose = onIndexChange ?? setLocalIndex;
    const replay = useReplay(index, values.length, choose);
    const candidate = values[index];
    const selectedValue = candidate != null && Number.isFinite(candidate) ? candidate : null;
    return (_jsxs("figure", { className: "ui-series", "data-tone": tone, "data-detail": detail || undefined, "data-compact": props.compact || undefined, "aria-labelledby": `${id}-label`, children: [_jsx("figcaption", { id: `${id}-label`, className: "ui-series__label", children: label }), unitLabel ? _jsx("p", { className: "ui-series__note", children: unitLabel }) : null, interactive ? _jsxs("output", { className: "ui-series__selected", children: [labels?.[index] ?? `Observation ${index + 1}`, ": ", selectedValue == null ? "Unknown" : format(selectedValue)] }) : null, _jsx(SeriesPlot, { ...props, domain: domain, index: index, detail: !!detail }), timeRange ? _jsxs("div", { className: "ui-series__range", children: [_jsx("span", { children: timeRange[0] }), _jsx("span", { children: timeRange[1] })] }) : null, _jsx("p", { className: detail ? "ui-series__note" : "ui-visually-hidden", children: summary(props) }), reference ? _jsx("p", { className: "ui-series__note", children: reference.label }) : null, interactive && values.length > 1 ? _jsxs("div", { className: "ui-series__controls", children: [_jsx(Button, { kind: "secondary", size: "sm", "aria-pressed": replay.playing, onClick: replay.toggle, children: replay.playing ? "Pause replay" : "Replay history" }), _jsx("input", { type: "range", min: 0, max: values.length - 1, value: index, "aria-label": `${label}: recorded observation`, "aria-valuetext": `${labels?.[index] ?? `Observation ${index + 1}`}: ${selectedValue == null ? "Unknown" : format(selectedValue)}`, onChange: (event) => { replay.pause(); choose(Number(event.target.value)); } })] }) : null, detail ? _jsxs("div", { className: "ui-series__evidence", children: [_jsxs(EvidencePanel, { title: `${label}: recorded observations`, label: `Inspect ${values.length} observations`, children: [_jsxs("p", { className: "ui-series__note", children: [summary(props), unitLabel ? ` ${unitLabel}` : ""] }), _jsxs("table", { className: "ui-evidence-table", children: [_jsxs("caption", { children: [label, timeRange ? ` · ${timeRange[0]}–${timeRange[1]}` : ""] }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "Observation" }), _jsx("th", { scope: "col", children: "Recorded value" })] }) }), _jsx("tbody", { children: values.map((value, i) => _jsxs("tr", { children: [_jsx("th", { scope: "row", children: labels?.[i] ?? `Observation ${i + 1}` }), _jsx("td", { children: value == null || !Number.isFinite(value) ? "Unknown" : format(value) })] }, i)) })] })] }), _jsx("ol", { className: "ui-visually-hidden", "aria-label": `${label}: accessible observations`, children: values.map((value, i) => _jsxs("li", { children: [labels?.[i] ?? `Observation ${i + 1}`, ": ", value == null || !Number.isFinite(value) ? "Unknown" : format(value)] }, i)) })] }) : null] }));
}
