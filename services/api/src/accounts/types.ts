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

// Gates what actually needs an account: playing without an account is
// possible up to the point where entitlement is needed.
export type GatedCapability = "god-mode-entitlement";

export function requiresAccount(capability: GatedCapability | "play"): boolean {
  return capability !== "play";
}
