const root = "";
const { playCampaign } = await import(`${root}packages/engine/dist/balance-harness.js`);
let last; playCampaign("balance-0", "prudent", 13, "democrat", undefined, { observeWeek(s) { last = s; } });
const rev = last.ledger.filter((e) => e.description === "The country revises its reading of the administration.");
console.log("weekly revision entries", rev.length, "with mood diff", rev.filter((e) => e.mood).length, "sample keys", Object.keys(rev[0] ?? {}).join(","), "sample cost", JSON.stringify(rev[0]?.cost));
