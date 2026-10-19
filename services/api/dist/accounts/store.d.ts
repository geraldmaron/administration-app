import type { Account, AccountId } from "./types.js";
export interface AccountStore {
    create(email: string): Promise<Account>;
    findByEmail(email: string): Promise<Account | null>;
    findById(id: AccountId): Promise<Account | null>;
    markDeleted(id: AccountId): Promise<void>;
}
export declare class InMemoryAccountStore implements AccountStore {
    private byId;
    private idByEmail;
    private nextId;
    create(email: string): Promise<Account>;
    findByEmail(email: string): Promise<Account | null>;
    findById(id: AccountId): Promise<Account | null>;
    markDeleted(id: AccountId): Promise<void>;
}
