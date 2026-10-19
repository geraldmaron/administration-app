// Resolves @admin/world to its source, so the probe runs the engine source
// (and an older engine dist) without a build of the world package.
import { fileURLToPath } from "node:url";

const world = fileURLToPath(new URL("../../../../../packages/world/src/index.ts", import.meta.url));

export default { resolve: { alias: [{ find: /^@admin\/world$/, replacement: world }] } };
