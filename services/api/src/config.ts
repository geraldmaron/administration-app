/**
 * Every secret this service uses comes from the environment, is required
 * rather than defaulted, and fails at startup when absent. A default would be
 * a committed secret with extra steps, and a silently-absent key would turn a
 * signing or verification failure into a runtime surprise much later.
 */

export class MissingConfigError extends Error {
  constructor(name: string, purpose: string) {
    super(`environment variable ${name} is not set — required for ${purpose}`);
    this.name = "MissingConfigError";
  }
}

export type Env = Readonly<Record<string, string | undefined>>;

export function requireEnv(env: Env, name: string, purpose: string): string {
  const value = env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new MissingConfigError(name, purpose);
  }
  return value;
}

/** Present-or-absent, for integrations a given deployment may legitimately not run. */
export function optionalEnv(env: Env, name: string): string | undefined {
  const value = env[name];
  return value === undefined || value.trim().length === 0 ? undefined : value;
}
