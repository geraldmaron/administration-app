#!/usr/bin/env node
// Proves verify-person-relationship-provenance.mjs actually rejects the graphs
// it claims to. A gate that has only ever been run against a generator that
// passes it is a gate nobody has tested, and this one guards a defect that
// shipped: 88% of every tie in the game carrying one sentence, mentorships whose
// junior half read as the mentor, and ties across borders and across decades
// that never touched.
//
// The gate's input is a generated cast, not a directory, so a fixture cannot be
// a tree the gate is pointed at. It is pointed at a graph instead:
// PERSON_NETWORK_FIXTURE_PATH names a JSON file of `{ people, edges }`, and the
// gate runs its rules over that instead of building a cast. Each fixture below
// starts from one small graph that satisfies every rule — twelve people, one tie
// of each of the six kinds — and breaks exactly one thing, so the verdict is
// about that break and nothing else. Two fixtures must PASS: the untouched
// baseline, which proves the gate does not over-fire, and the empty graph, which
// must be refused by the vacuity guard rather than sailing through green.
//
// The temp file is removed in a finally block, and the last thing this script
// does is run the gate on the real generated cast and exit with its answer.
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixturePath = path.join(tmpdir(), `person-network-proof-${process.pid}.json`);

const HOME = "NAT-HOME";
const ABROAD = "NAT-ABROAD";

/**
 * A person, as the gate reads one.
 *
 * Only the fields any rule actually looks at: who they are, how old, where they
 * hold citizenship, what they carry a ticket for, where they studied, and the
 * dated postings that make a working life comparable to somebody else's.
 */
function person(id, name, extra) {
  return { id, name, age: 50, nationality: HOME, education: { school: `school-${id}` }, career: [], ...extra };
}

const post = (archetype, startAge, years) => ({ archetype, startAge, years });

/**
 * One tie of every kind, each one the record can support.
 *
 * The mentorship is the interesting row: `p-senior` entered the civil service 38
 * years ago and `p-junior` 14, they served eleven years alongside each other,
 * and the senior is 22 years older — which is what makes one edge readable as
 * "Mentor" from one file and "Protégé" from the other.
 */
function baseline() {
  return {
    people: [
      person("p-senior", "Alma Reyes", { age: 62, career: [post("civil-service", 24, 35)] }),
      person("p-junior", "Dov Halloran", { age: 40, career: [post("civil-service", 26, 12)] }),
      person("p-colleague-a", "Ines Farrow", { age: 55, career: [post("business", 30, 20)] }),
      person("p-colleague-b", "Marcus Bell", { age: 50, career: [post("business", 28, 18)] }),
      person("p-peer-a", "Nadia Okonkwo", { age: 45, education: { school: "school-north" } }),
      person("p-peer-b", "Rufus Kim", { age: 44, education: { school: "school-north" } }),
      person("p-ally-a", "Tessa Vance", { age: 58, party: "party-blue" }),
      person("p-ally-b", "Owen Pryce", { age: 57, party: "party-blue" }),
      person("p-rival-a", "Greta Sandoval", { age: 60, party: "party-red" }),
      person("p-rival-b", "Hal Duarte", { age: 59, party: "party-red" }),
      person("p-envoy-home", "Lena Marsh", { age: 61, career: [post("diplomatic-corps", 30, 25)] }),
      person("p-envoy-abroad", "Yusuf Adler", {
        age: 59,
        nationality: ABROAD,
        career: [post("diplomatic-corps", 32, 22)],
      }),
    ],
    edges: [
      {
        from: "p-senior",
        to: "p-junior",
        kind: "mentor",
        provenance: "civil-service",
        reason: "Halloran began in the civil service while Reyes was already 24 years into it; they served 11 years alongside each other.",
        strength: 0.75,
      },
      {
        from: "p-colleague-a",
        to: "p-colleague-b",
        kind: "former-colleague",
        provenance: "business",
        reason: "Farrow and Bell were both in business, and their years there overlapped by 17 years.",
        strength: 0.64,
      },
      {
        from: "p-peer-a",
        to: "p-peer-b",
        kind: "peer",
        provenance: "education",
        reason: "They were students at the same school at the same time, 3 years of it overlapping.",
        strength: 0.52,
      },
      {
        from: "p-ally-a",
        to: "p-ally-b",
        kind: "ally",
        provenance: "party",
        reason: "The same party ticket keeps putting them in the same rooms, and they read economics almost identically.",
        strength: 0.61,
      },
      {
        from: "p-rival-a",
        to: "p-rival-b",
        kind: "rival",
        provenance: "party",
        reason: "The same party ticket keeps putting them in the same rooms, and they are furthest apart on economics.",
        strength: 0.58,
      },
      {
        from: "p-envoy-home",
        to: "p-envoy-abroad",
        kind: "prior-counterpart",
        provenance: "diplomatic",
        reason: "They worked the same file from opposite capitals: 21 years in the diplomatic corps at the same time, one of them holding a foreign seat.",
        strength: 0.55,
      },
    ],
  };
}

/** The baseline, deep-copied, so a mutation cannot reach the next fixture. */
const fresh = () => JSON.parse(JSON.stringify(baseline()));

const personIn = (graph, id) => graph.people.find((entry) => entry.id === id);
const edgeIn = (graph, kind) => graph.edges.find((entry) => entry.kind === kind);

let failed = false;

/**
 * @param {string} label
 * @param {{ people: unknown[], edges: unknown[] }} graph
 * @param {boolean} expectPass
 * @param {RegExp} expectPattern
 */
function prove(label, graph, expectPass, expectPattern) {
  writeFileSync(fixturePath, JSON.stringify(graph, null, 2));
  let passed = false;
  let output = "";
  try {
    output = execFileSync("node", ["scripts/verify-person-relationship-provenance.mjs"], {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, PERSON_NETWORK_FIXTURE_PATH: fixturePath },
    }).toString();
    passed = true;
  } catch (err) {
    output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  if (passed !== expectPass) {
    console.error(`FAIL: ${label} — expected the gate to ${expectPass ? "pass" : "fail"}, it did not.\n${output}`);
    failed = true;
    return;
  }
  if (!expectPattern.test(output)) {
    console.error(`FAIL: ${label} — the gate's verdict did not mention what it should.\n${output}`);
    failed = true;
    return;
  }
  console.log(`  ok: ${label}`);
}

console.log("verify-person-relationship-provenance proof:");

try {
  prove(
    "a graph whose every tie the two records support passes",
    fresh(),
    true,
    /OK: 6 ties over 12 people/,
  );

  prove(
    "a mentorship pointing from the junior to the senior",
    (() => {
      const graph = fresh();
      const mentor = edgeIn(graph, "mentor");
      [mentor.from, mentor.to] = [mentor.to, mentor.from];
      return graph;
    })(),
    false,
    /the junior half of this mentorship would read as the mentor on their own file/,
  );

  prove(
    "a person who is the junior end of two mentorships",
    (() => {
      const graph = fresh();
      graph.people.push(person("p-senior-two", "Cato Willems", { age: 66, career: [post("civil-service", 22, 40)] }));
      graph.edges.push({
        from: "p-senior-two",
        to: "p-junior",
        kind: "mentor",
        provenance: "civil-service",
        reason: "Halloran began in the civil service while Willems was already 30 years into it; they served 10 years alongside each other.",
        strength: 0.7,
      });
      return graph;
    })(),
    false,
    /junior end of 2 mentorships/,
  );

  prove(
    "a tie out of education between two people who name different schools",
    (() => {
      const graph = fresh();
      personIn(graph, "p-peer-b").education.school = "school-south";
      return graph;
    })(),
    false,
    /out of education, but they name "school-north" and "school-south"/,
  );

  prove(
    "a tie out of a working world whose two careers never overlapped",
    (() => {
      const graph = fresh();
      const colleague = personIn(graph, "p-colleague-b");
      colleague.age = 70;
      colleague.career = [post("business", 25, 10)];
      return graph;
    })(),
    false,
    /their years there never overlapped/,
  );

  prove(
    "a tie out of a working world one of the two never worked in",
    (() => {
      const graph = fresh();
      personIn(graph, "p-colleague-b").career = [post("academia", 30, 18)];
      return graph;
    })(),
    false,
    /holds no posting there/,
  );

  prove(
    "two prior counterparts who hold the same citizenship",
    (() => {
      const graph = fresh();
      personIn(graph, "p-envoy-abroad").nationality = HOME;
      return graph;
    })(),
    false,
    /a counterpart is somebody else's diplomat/,
  );

  prove(
    "a former-colleague tie across a border",
    (() => {
      const graph = fresh();
      personIn(graph, "p-colleague-b").nationality = ABROAD;
      return graph;
    })(),
    false,
    /only a prior counterpart crosses a border/,
  );

  prove(
    "a seventh tie on one person",
    (() => {
      const graph = fresh();
      for (let index = 0; index < 6; index += 1) {
        const id = `p-desk-${index}`;
        graph.people.push(person(id, `Deputy ${index}`, { age: 50 + index, career: [post("civil-service", 25, 20)] }));
        graph.edges.push({
          from: "p-senior",
          to: id,
          kind: "former-colleague",
          provenance: "civil-service",
          reason: `Reyes and Deputy ${index} were both in the civil service, and their years there overlapped by ${12 + index} years.`,
          strength: 0.5,
        });
      }
      return graph;
    })(),
    false,
    /carries 7 ties, over the 6 a dossier can hold/,
  );

  prove(
    "one shared history sold as two different ties",
    (() => {
      const graph = fresh();
      graph.edges.push({
        from: "p-colleague-b",
        to: "p-colleague-a",
        kind: "rival",
        provenance: "business",
        reason: "17 years together in business keeps putting them in the same rooms, and they are furthest apart on economics.",
        strength: 0.6,
      });
      return graph;
    })(),
    false,
    /are seated twice — once as former-colleague/,
  );

  prove(
    "an edge naming somebody who is not in the cast",
    (() => {
      const graph = fresh();
      edgeIn(graph, "mentor").to = "p-nobody";
      return graph;
    })(),
    false,
    /names "p-nobody" as its to, and no such person is in the cast/,
  );

  prove(
    "a declared kind that reaches no player",
    (() => {
      const graph = fresh();
      graph.edges = graph.edges.filter((edge) => edge.kind !== "rival");
      return graph;
    })(),
    false,
    /no edge on this graph is a "rival"/,
  );

  prove(
    "a graph where one sentence speaks for every tie",
    (() => {
      const graph = fresh();
      for (const edge of graph.edges) {
        edge.reason = "They share an alma mater and the senior figure mentored the junior there.";
      }
      return graph;
    })(),
    false,
    /under the 50% floor/,
  );

  prove("a graph with nothing in it at all", { people: [], edges: [] }, false, /a gate that checked nothing is not a gate/);
} finally {
  rmSync(fixturePath, { force: true });
}

if (failed) process.exit(1);

console.log("\nProof complete. Running the gate on the real generated cast:\n");
let realOutput = "";
let realPassed = false;
try {
  realOutput = execFileSync("node", ["scripts/verify-person-relationship-provenance.mjs"], {
    cwd: root,
    stdio: "pipe",
  }).toString();
  realPassed = true;
} catch (err) {
  realOutput = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}
process.stdout.write(realOutput);
if (!realPassed) {
  console.error("\nThe gate's mechanism is proven above; this last failure is the generated graph, not the gate.");
}
process.exit(realPassed ? 0 : 1);
