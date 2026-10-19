#!/usr/bin/env node
// The Continue control must not spend time while work is open, and it must
// not defer that work as part of the same press. Continue lives in the top
// bar, so the default target is the shell's control; until that control is
// built the gate fails and says so, rather than passing over nothing.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = process.argv[2] ?? "apps/web/src/shell/ContinueControl.tsx";
const file = path.resolve(root, target);
if (!existsSync(file)) {
  console.error(`FAIL: ${target} does not exist. Build the Continue control there, or pass its path, so this gate has a press to guard.`);
  process.exit(1);
}
const source = readFileSync(file, "utf8");
const failures = [];

if (!source.includes("if (offer.held) return;")) {
  failures.push(`${target}: advance() does not return while the offer is held. Put the return back before continueUntilAttention.`);
}
if (source.includes("deferMatterPacket")) {
  failures.push(`${target}: Continue still builds a deferral. Remove deferMatterPacket from this control. Put off stays on the matter's own row.`);
}
if (!source.includes("continueUntilAttention")) {
  failures.push(`${target}: the control no longer calls continueUntilAttention, so this gate cannot see the press it is supposed to guard.`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`ok ${target}`);
