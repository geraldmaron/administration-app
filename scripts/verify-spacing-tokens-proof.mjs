#!/usr/bin/env node
// Proves verify-spacing-tokens.mjs refuses a numeric spacing or radius prop,
// rather than passing because today's tree is forgiven.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proveGate } from "./lib/ratchet-proof.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EMPTY = JSON.stringify({ entries: {} });

proveGate({
  root,
  gate: "scripts/verify-spacing-tokens.mjs",
  cases: [
    { label: "tokens and zero", files: { "player/a.tsx": 'export const A = () => <View gap="md" padding="lg" borderRadius="card" margin={0} />;\n', "baseline.json": EMPTY }, pass: true, says: /0 numeric spacing/ },
    { label: "a numeric gap", files: { "player/a.tsx": "export const A = () => <View gap={14} />;\n", "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/a\.tsx/ },
    { label: "a numeric corner and a negative margin", files: { "player/a.tsx": "export const A = () => <View borderTopLeftRadius={6} marginHorizontal={-4} />;\n", "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/a\.tsx {2}\(2 found/ },
    { label: "a forgiven numeric padding", files: { "player/a.tsx": "export const A = () => <View paddingVertical={10} />;\n", "baseline.json": JSON.stringify({ entries: { "player/a.tsx": 1 } }) }, pass: true, says: /1 numeric spacing/ },
    { label: "a baseline still forgiving a fixed file", files: { "player/a.tsx": 'export const A = () => <View gap="sm" />;\n', "baseline.json": JSON.stringify({ entries: { "player/a.tsx": 1 } }) }, pass: false, says: /STALE {2}player\/a\.tsx/ },
  ],
});
