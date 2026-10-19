/**
 * Every secret this service uses comes from the environment, is required
 * rather than defaulted, and fails at startup when absent. A default would be
 * a committed secret with extra steps, and a silently-absent key would turn a
 * signing or verification failure into a runtime surprise much later.
 */
export declare class MissingConfigError extends Error {
    constructor(name: string, purpose: string);
}
export type Env = Readonly<Record<string, string | undefined>>;
export declare function requireEnv(env: Env, name: string, purpose: string): string;
/** Present-or-absent, for integrations a given deployment may legitimately not run. */
export declare function optionalEnv(env: Env, name: string): string | undefined;
