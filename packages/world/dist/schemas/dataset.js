import { Settlement } from "./settlement.js";
import { z } from "zod";
import { Nation } from "./nation.js";
import { Relationship } from "./relationship.js";
import { Organization, Cradle, Charter } from "./org-cradle-charter.js";
import { City } from "./city.js";
import { State } from "./state.js";
import { District } from "./district.js";
// The whole-dataset shape the validator gates: every data change (world.usa,
// world.nations, world.traits-and-jitter, world.orgs-cradles-geography,
// world.cities) lands here. People are not in it: the cast is generated per
// campaign from the pool specs and role profiles, never stored.
export const WorldDataset = z.object({
    nations: z.array(Nation),
    cities: z.array(City),
    settlements: z.array(Settlement).optional(),
    states: z.array(State),
    districts: z.array(District),
    relationships: z.array(Relationship),
    organizations: z.array(Organization),
    cradles: z.array(Cradle),
    charters: z.array(Charter),
});
