#!/usr/bin/env node
// Proves verify-heading-levels.mjs refuses a heading past level 3, rather than
// passing because today's tree is forgiven.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proveGate } from "./lib/ratchet-proof.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EMPTY = JSON.stringify({ entries: {} });

proveGate({
  root,
  gate: "scripts/verify-heading-levels.mjs",
  cases: [
    { label: "levels 2 and 3", files: { "player/a.tsx": 'export const A = () => <><Text role="heading" aria-level={2}>a</Text><Text role="heading" aria-level="3">b</Text></>;\n', "baseline.json": EMPTY }, pass: true, says: /2 hand-written heading level\(s\) in the player, 0 deeper/ },
    { label: "a level 4", files: { "player/a.tsx": 'export const A = () => <Text role="heading" aria-level={4}>a</Text>;\n', "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/a\.tsx/ },
    { label: "a quoted level 5", files: { "player/b.tsx": 'export const B = () => <Text role="heading" aria-level="5">b</Text>;\n', "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/b\.tsx/ },
    { label: "a level 4 in a comment", files: { "player/a.tsx": '// was aria-level={4}\nexport const A = () => <Text role="heading" aria-level={3}>a</Text>;\n', "baseline.json": EMPTY }, pass: true, says: /0 deeper/ },
    { label: "a baseline still forgiving a fixed file", files: { "player/a.tsx": 'export const A = () => <Text role="heading" aria-level={3}>a</Text>;\n', "baseline.json": JSON.stringify({ entries: { "player/a.tsx": 1 } }) }, pass: false, says: /STALE {2}player\/a\.tsx/ },
    { label: "a tree with no heading", files: { "player/a.tsx": "export const A = 1;\n", "baseline.json": EMPTY }, pass: false, says: /checking nothing/ },
  ],
});
