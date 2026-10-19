// One flag for "this is not a shipped build": Metro defines __DEV__ for the
// bundles it serves, and a production export carries NODE_ENV instead.
export const isDevelopmentBuild: boolean = typeof __DEV__ === "boolean" ? __DEV__ : process.env["NODE_ENV"] !== "production";
