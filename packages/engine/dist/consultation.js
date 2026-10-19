const FOREIGN = { roleId: "role-foreign-minister" };
const TREASURY = { roleId: "role-treasury-minister" };
const DEFENSE = { roleId: "role-defense-minister" };
const INTELLIGENCE = { roleId: "role-intelligence-director" };
// The departments that own a piece of an instrument rather than the whole of
// it, and are therefore in the room from the rung their authority is actually
// engaged. Commerce writes the export controls a serious economic measure runs
// on; Justice has to say whether an order survives a court; Homeland Security
// runs the border a coercive measure is felt at; Health and Veterans are the
// departments a deployment and a relief operation are actually carried out by.
const COMMERCE = { roleId: "role-commerce-secretary" };
const JUSTICE = { roleId: "role-attorney-general" };
const HOMELAND = { roleId: "role-homeland-secretary" };
const HEALTH = { roleId: "role-health-secretary" };
const VETERANS = { roleId: "role-veterans-secretary" };
const ENERGY = { roleId: "role-energy-secretary" };
const CONSULTATION = {
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
export function consultationFor(instrument, rung) {
    return CONSULTATION[instrument][rung - 1] ?? [];
}
