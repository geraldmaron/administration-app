const root = "";
const { foundedForBalance } = await import(`${root}packages/engine/dist/balance-harness.js`);
const { campaign: c } = foundedForBalance("coercion-0");
const ns = Object.values(c.nations).map(n=>n.base);
console.log("nations", ns.length, "with chokepoints list", ns.filter(n=>n.geo.chokepoints?.length).length, "with dependence", ns.filter(n=>n.geo.chokepointDependence?.length).length, "coastline", ns.filter(n=>n.geo.coastline).length);
for (const id of ["IRN","OMN","YEM","SAU","ARE","QAT","EGY","CHN","JPN","USA"]) { const n=c.nations[id]?.base; if(!n) {console.log(id,"missing");continue;} console.log(id, JSON.stringify(n.geo.chokepoints), JSON.stringify(n.geo.chokepointDependence), "naval", n.stats.military.branchStrength.naval, "exp", n.stats.trade.exports, "imp", n.stats.trade.imports, "gdp", n.stats.economy.gdp, "top", JSON.stringify(n.stats.trade.topExports), "energy", JSON.stringify({p:n.stats.energy.production,c:n.stats.energy.consumption})); }
const ops = c.operators ?? c.nonState ?? null; console.log("campaign keys", Object.keys(c).join(","));
