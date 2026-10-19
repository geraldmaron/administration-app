import type { InstrumentId, RungLevel } from "./instruments.js";

// Who has to have heard about an act before it is taken, per instrument and
// per rung.
//
// Split out of `instruments.ts` when the cabinet grew and the table grew with
// it: the departments that own a piece of an instrument are now in the room
// from the rung their authority is actually engaged, which is more entries
// than the file it lived in had budget for. It is authored data — the
// consultation is a fact about the office rather than a figure the simulation
// carries — and the rule is escalation: the further up a ladder an order sits,
// the more of the government has to have heard about it first.

/**
 * Who has to be told, per instrument and rung.
 *
 * A seat is named by its role id and resolved through the charter's own titles
 * at the point of rendering, never quoted: the ids are the engine's
 * cross-charter contract and the words are presentation. Bodies are named
 * outright because a legislature is an institution rather than a chair, and the
 * charter authors those in its own institution list.
 *
 * Authored, because the consultation is a fact about the office rather than a
 * figure the simulation carries. The rule is escalation — the further up a
 * ladder an order sits, the more of the government has to have heard about it
 * first.
 */
export type Consultee = { readonly roleId: string } | { readonly body: string };

const FOREIGN = { roleId: "role-foreign-minister" } as const;
const TREASURY = { roleId: "role-treasury-minister" } as const;
const DEFENSE = { roleId: "role-defense-minister" } as const;
const INTELLIGENCE = { roleId: "role-intelligence-director" } as const;
// The departments that own a piece of an instrument rather than the whole of
// it, and are therefore in the room from the rung their authority is actually
// engaged. Commerce writes the export controls a serious economic measure runs
// on; Justice has to say whether an order survives a court; Homeland Security
// runs the border a coercive measure is felt at; Health and Veterans are the
// departments a deployment and a relief operation are actually carried out by.
const COMMERCE = { roleId: "role-commerce-secretary" } as const;
const JUSTICE = { roleId: "role-attorney-general" } as const;
const HOMELAND = { roleId: "role-homeland-secretary" } as const;
const HEALTH = { roleId: "role-health-secretary" } as const;
const VETERANS = { roleId: "role-veterans-secretary" } as const;
const ENERGY = { roleId: "role-energy-secretary" } as const;

const CONSULTATION: Readonly<Record<InstrumentId, readonly (readonly Consultee[])[]>> = {
  diplomatic: [
    [FOREIGN],
    [FOREIGN],
    [FOREIGN, { body: "The foreign affairs committees" }],
    [FOREIGN, { body: "Allied capitals, before the pressure is joint" }],
    [FOREIGN, { body: "Congressional leadership" }],
  ],
  economic: [
    [TREASURY],
    [TREASURY],
    // From here up the measure is an export control or a designation, and
    // Commerce writes and enforces those. A tariff schedule is Treasury's; the
    // entity list is not.
    [TREASURY, COMMERCE, { body: "Allied capitals, so the measure is not evaded through them" }],
    [TREASURY, COMMERCE, { body: "Congressional leadership" }],
    [TREASURY, COMMERCE, JUSTICE, { body: "Congress, which will be asked to codify it" }],
  ],
  covert: [
    [INTELLIGENCE],
    [INTELLIGENCE],
    [INTELLIGENCE, { body: "The intelligence committees, by notification" }],
    // A finding is a legal instrument before it is an operation, and the
    // Attorney General is who says whether this one is lawful. Leaving Justice
    // out of the room was the model asserting that a covert action has no
    // lawyer in it.
    [INTELLIGENCE, JUSTICE, { body: "Congressional leadership, before the secret order is signed" }],
    [INTELLIGENCE, JUSTICE, { body: "Congressional leadership" }, { body: "Counsel, on the secret order" }],
  ],
  military: [
    [DEFENSE],
    [DEFENSE, { body: "The host government" }],
    [DEFENSE, { body: "Congressional leadership, under the War Powers Resolution (Congress's war clock)" }],
    // Committing forces is a decision about people who come home, and the
    // department that receives them is in the room before it happens rather
    // than after.
    [DEFENSE, VETERANS, { body: "Congressional leadership, under the War Powers Resolution (Congress's war clock)" }],
    [
      DEFENSE,
      VETERANS,
      ENERGY,
      { body: "Congress, which alone declares war" },
      { body: "Allied capitals whose forces are committed with ours" },
    ],
  ],
  assistance: [
    [FOREIGN],
    // Relief is delivered by the departments that hold the capability, not by
    // the ministry that announces it: Health runs the medical side and Homeland
    // Security runs the disaster response.
    [FOREIGN, HEALTH, { body: "The appropriations committees" }],
    [TREASURY, HEALTH, HOMELAND, { body: "The appropriations committees" }],
    [DEFENSE, HOMELAND, { body: "Congress, which is notified of every major transfer" }],
    [DEFENSE, { body: "The Senate, which ratifies what a guarantee becomes" }],
  ],
};

export function consultationFor(instrument: InstrumentId, rung: RungLevel): readonly Consultee[] {
  return CONSULTATION[instrument][rung - 1] ?? [];
}
