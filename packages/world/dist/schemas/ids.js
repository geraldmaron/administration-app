import { z } from "zod";
// Branded string ids. Branding stops a raw string being passed
// where a specific id type is expected without a deliberate cast.
export const NationId = z.string().min(1).brand();
export const PersonId = z.string().min(1).brand();
export const OrgId = z.string().min(1).brand();
export const CharterId = z.string().min(1).brand();
export const RegionId = z.string().min(1).brand();
export const ChokepointId = z.string().min(1).brand();
export const CradleId = z.string().min(1).brand();
export const TreatyId = z.string().min(1).brand();
export const RoleId = z.string().min(1).brand();
export const FactionId = z.string().min(1).brand();
export const PartyId = z.string().min(1).brand();
// CITY-{ISO3}-{slug} — e.g. CITY-USA-pittsburgh, CITY-DEU-hamburg.
export const SettlementId = z.string().regex(/^SETTLEMENT-USA-[A-Z]{2}-[a-z0-9-]+$/).brand();
export const CityId = z.string().min(1).brand();
export const DistrictId = z.string().min(1).brand();
export const CurrencyCode = z.string().length(3);
