#!/usr/bin/env node
// Proves verify-shared-components.mjs refuses a player component that shadows
// a design-system export and a <Text> that sets its own size, rather than
// passing because today's tree is forgiven.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proveGate } from "./lib/ratchet-proof.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EMPTY = JSON.stringify({ entries: {} });
const UI = { "ui/data/index.ts": 'export { Fact, Tile as Tile, type FactProps } from "./Fact";\n' };

proveGate({
  root,
  gate: "scripts/verify-shared-components.mjs",
  cases: [
    { label: "shared pieces and the ramp", files: { ...UI, "player/a.tsx": 'import { Fact } from "@admin/ui";\nfunction Summary() { return <Text variant="caption" weight="strong" tone="secondary">x</Text>; }\n', "baseline.json": EMPTY }, pass: true, says: /0 shadowing component\(s\) and 0 text style/ },
    { label: "a local Fact", files: { ...UI, "player/a.tsx": "function Fact() { return null; }\n", "baseline.json": EMPTY }, pass: false, says: /NEW {2}shadow {2}player\/a\.tsx/ },
    { label: "an arrow Tile", files: { ...UI, "player/a.tsx": "export const Tile = () => null;\n", "baseline.json": EMPTY }, pass: false, says: /NEW {2}shadow {2}player\/a\.tsx/ },
    { label: "a raw font size in the player", files: { ...UI, "player/a.tsx": 'const A = () => <Text variant="caption" fontSize={11}>x</Text>;\n', "baseline.json": EMPTY }, pass: false, says: /NEW {2}text-style {2}player\/a\.tsx/ },
    { label: "a raw weight in the design system", files: { ...UI, "ui/data/Fact.tsx": 'export const Fact = () => <Text fontWeight="700">x</Text>;\n', "player/a.tsx": "export {};\n", "baseline.json": EMPTY }, pass: false, says: /NEW {2}text-style {2}ui\/data\/Fact\.tsx/ },
    { label: "SVG text is drawn, not set", files: { ...UI, "player/a.tsx": "const A = () => <SvgText fontSize={12}>x</SvgText>;\n", "baseline.json": EMPTY }, pass: true, says: /0 text style/ },
    { label: "a forgiven shadow", files: { ...UI, "player/a.tsx": "function Fact() { return null; }\n", "baseline.json": JSON.stringify({ entries: { "shadow  player/a.tsx": 1 } }) }, pass: true, says: /1 shadowing/ },
    { label: "a baseline still forgiving a fixed file", files: { ...UI, "player/a.tsx": "export {};\n", "baseline.json": JSON.stringify({ entries: { "shadow  player/a.tsx": 1 } }) }, pass: false, says: /STALE {2}shadow {2}player\/a\.tsx/ },
  ],
});
