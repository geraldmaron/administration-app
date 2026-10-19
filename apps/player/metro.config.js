// The workspace is pnpm with node-linker=hoisted (see the root .npmrc): every
// package sits in the root node_modules, so Metro watches the whole
// workspace and resolves only from the app's and the root's node_modules.
// Hierarchical lookup is off so a stray nested copy can never become a
// second React.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules"), path.resolve(workspaceRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
