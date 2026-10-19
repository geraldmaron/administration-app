export type AccountId = string;
export type Account = {
    id: AccountId;
    email: string;
    createdAt: string;
    deletedAt: string | null;
};
export type Session = {
    accessToken: string;
    refreshToken: string;
    accountId: AccountId;
    expiresAt: string;
};
export type GatedCapability = "god-mode-entitlement";
export declare function requiresAccount(capability: GatedCapability | "play"): boolean;
