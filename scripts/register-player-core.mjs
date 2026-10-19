import { registerHooks } from "node:module";

// player-core compiles with bundler resolution, so its dist imports siblings
// without an extension ("./founding-options"). Vite and Vitest resolve that;
// Node's ESM loader does not. Rather than keep a second copy of the founding
// slate here, resolve those specifiers the way the bundler does, for that one
// package only.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const extensionless = !/\.(?:[cm]?js|json)$/.test(specifier);
    if (!relative || !extensionless || !context.parentURL?.includes("/packages/player-core/dist/")) {
      return nextResolve(specifier, context);
    }
    try {
      return nextResolve(`${specifier}.js`, context);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
      return nextResolve(`${specifier}/index.js`, context);
    }
  },
});
