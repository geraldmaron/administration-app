import { z } from "zod";

// Branded string ids. Branding stops a raw string being passed
// where a specific id type is expected without a deliberate cast.
export const NationId = z.string().min(1).brand<"NationId">();
export const PersonId = z.string().min(1).brand<"PersonId">();
export const OrgId = z.string().min(1).brand<"OrgId">();
export const CharterId = z.string().min(1).brand<"CharterId">();
export const RegionId = z.string().min(1).brand<"RegionId">();
export const ChokepointId = z.string().min(1).brand<"ChokepointId">();
export const CradleId = z.string().min(1).brand<"CradleId">();
export const TreatyId = z.string().min(1).brand<"TreatyId">();
export const RoleId = z.string().min(1).brand<"RoleId">();
export const FactionId = z.string().min(1).brand<"FactionId">();
export const PartyId = z.string().min(1).brand<"PartyId">();
// CITY-{ISO3}-{slug} — e.g. CITY-USA-pittsburgh, CITY-DEU-hamburg.
export const SettlementId = z.string().regex(/^SETTLEMENT-USA-[A-Z]{2}-[a-z0-9-]+$/).brand<"SettlementId">();
export const CityId = z.string().min(1).brand<"CityId">();
export const DistrictId = z.string().min(1).brand<"DistrictId">();
export const CurrencyCode = z.string().length(3);

export type NationId = z.infer<typeof NationId>;
export type PersonId = z.infer<typeof PersonId>;
export type OrgId = z.infer<typeof OrgId>;
export type CharterId = z.infer<typeof CharterId>;
export type RegionId = z.infer<typeof RegionId>;
export type ChokepointId = z.infer<typeof ChokepointId>;
export type CradleId = z.infer<typeof CradleId>;
export type TreatyId = z.infer<typeof TreatyId>;
export type RoleId = z.infer<typeof RoleId>;
export type FactionId = z.infer<typeof FactionId>;
export type PartyId = z.infer<typeof PartyId>;
export type SettlementId = z.infer<typeof SettlementId>;
export type CityId = z.infer<typeof CityId>;
export type DistrictId = z.infer<typeof DistrictId>;
export type CurrencyCode = z.infer<typeof CurrencyCode>;
