import { describe } from "vitest";
import { borrowingDoesNotBuyTheCountry } from "./__fixtures__/borrowing-r11.js";

// R1.1 for one party, in a file of its own so the balance runner measures the
// three parties side by side; the check itself is in the fixture.
describe("R1.1, borrowing does not buy the country", () => {
  borrowingDoesNotBuyTheCountry("republican");
});
