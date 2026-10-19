#!/usr/bin/env node
// Proves verify-reading-keys.mjs refuses a drawn reading with no frame and no
// help, rather than passing because today's tree is forgiven.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { proveGate } from "./lib/ratchet-proof.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EMPTY = JSON.stringify({ entries: {} });
const bare = 'import { Meter } from "@admin/ui";\nexport const A = () => <Meter label="Approval" value={0.4} figure="40%" />;\n';

proveGate({
  root,
  gate: "scripts/verify-reading-keys.mjs",
  cases: [
    { label: "a meter inside a ReadingFrame", files: { "player/a.tsx": 'import { Meter, ReadingFrame } from "@admin/ui";\nexport const A = () => <ReadingFrame title="Approval"><Meter label="x" value={0.4} figure="40%" /></ReadingFrame>;\n', "baseline.json": EMPTY }, pass: true, says: /1 drawn reading\(s\) in the player, 0 still/ },
    { label: "a chart that passes help itself", files: { "player/a.tsx": 'import { BenchmarkChart } from "@admin/ui";\nexport const A = () => <BenchmarkChart title="t" help={{ meaning: "m" }} x={[]} series={[]} format={String} />;\n', "baseline.json": EMPTY }, pass: true, says: /0 still/ },
    { label: "a bare meter", files: { "player/a.tsx": bare, "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/a\.tsx::Meter/ },
    { label: "a bare chart imported under another name from a subpath", files: { "player/a.tsx": 'import { RollChart as Rolls } from "@admin/ui/legislature";\nexport const A = () => <Rolls label="l" entries={[]} seats={100} />;\n', "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/a\.tsx::RollChart/ },
    { label: "a frame named only in a comment", files: { "player/a.tsx": `// wrap this in <ReadingFrame later\n${bare}`, "baseline.json": EMPTY }, pass: false, says: /NEW {2}player\/a\.tsx::Meter/ },
    { label: "a forgiven bare meter", files: { "player/a.tsx": bare, "baseline.json": JSON.stringify({ entries: { "player/a.tsx::Meter": 1 } }) }, pass: true, says: /1 still without/ },
    { label: "a baseline still forgiving a framed reading", files: { "player/a.tsx": 'import { Meter, ReadingFrame } from "@admin/ui";\nexport const A = () => <ReadingFrame title="t"><Meter label="x" value={0} figure="0" /></ReadingFrame>;\n', "baseline.json": JSON.stringify({ entries: { "player/a.tsx::Meter": 1 } }) }, pass: false, says: /STALE {2}player\/a\.tsx::Meter/ },
    { label: "a tree with no reading at all", files: { "player/a.tsx": "export const A = 1;\n", "baseline.json": EMPTY }, pass: false, says: /checking nothing/ },
  ],
});
