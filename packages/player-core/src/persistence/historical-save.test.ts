import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  EMPTY_TIE, loadSave, selectCausesOf, selectCollectionProducts, selectCommitments,
  selectPerson, selectRelationship, selectStandingTaskings, type SaveFile,
} from "@admin/engine";
import { recordEntry } from "../record/record-entry";

// Written by the v57 save writer at d1b2f3a82 after a real founding, tasking,
// tariff and lift, case disposition, and six simulated turns. The pinned source
// and dist both declare v57; a later v63 commit has stale dist and missing
// source modules, so it cannot supply a reproducible historical save.
const fixture = new URL("../../../engine/src/__fixtures__/supported-save-v57-d1b2f3a82.json.gz", import.meta.url);

describe("supported historical save", () => {
  it("keeps identities, known reports, occurrences, commitments, relationships, and causes together", () => {
    const saved = JSON.parse(gunzipSync(readFileSync(fixture)).toString("utf8")) as SaveFile;
    expect(saved.schemaVersion).toBe(57);
    const before = saved.campaign;
    const loaded = loadSave(saved);

    expect(Object.keys(before.people).length).toBeGreaterThan(0);
    // Only Congress migration may change offices; only tie migration may move
    // old Hill warmth. No unrelated person's history may be rewritten.
    const migratedRapport = new Map(before.congress.leadership.flatMap((figure) => {
      const legacy = figure as typeof figure & { readonly disposition?: number };
      return legacy.disposition === undefined ? [] : [[figure.person, legacy.disposition] as const];
    }));
    const reseated = new Set([
      ...(loaded.congress.members ?? []).map((member) => member.person),
      ...before.congress.leadership.map((figure) => figure.person),
      ...Object.values(before.congress.committees).flatMap((panel) => [panel.chair, panel.ranking]).filter((id) => id !== undefined),
    ]);
    const legacyCongress = before.congress as typeof before.congress & { readonly promises?: readonly unknown[] };
    expect(legacyCongress.promises ?? []).toEqual([]);
    const changedPeople = Object.entries(before.people)
      .filter(([_id, person]) => {
        const { currentRole: _oldOffice, tie: _oldTie, ...oldIdentity } = person;
        const { currentRole: _newOffice, tie: _newTie, ...newIdentity } = loaded.people[person.base.id]!;
        return JSON.stringify(newIdentity) !== JSON.stringify(oldIdentity);
      })
      .map(([id]) => id);
    const changedInstitutions = Object.entries(before.institutions)
      .filter(([id, institution]) => JSON.stringify(loaded.institutions[id]) !== JSON.stringify(institution))
      .map(([id]) => id);
    expect(changedPeople).toEqual([]);
    for (const person of Object.values(before.people)) {
      const actual = loaded.people[person.base.id]!;
      if (actual.currentRole !== person.currentRole) expect(reseated.has(person.base.id)).toBe(true);
      const rapport = migratedRapport.get(person.base.id);
      const expectedTie = rapport === undefined ? person.tie : { ...(person.tie ?? EMPTY_TIE), rapport };
      expect(actual.tie).toEqual(expectedTie);
    }
    expect(changedInstitutions).toEqual([]);
    expect(loaded.relationships).toEqual(before.relationships);
    const personId = Object.values(before.player.cabinet)[0];
    expect(personId).toBeDefined();
    expect(selectPerson(loaded, personId!)?.base).toEqual(selectPerson(before, personId!)?.base);
    const relationship = Object.values(before.relationships)[0]!;
    expect(selectRelationship(loaded, relationship.from, relationship.to)).toEqual(relationship);

    expect(Object.keys(before.security.intelligence.taskings)).toHaveLength(1);
    expect(Object.keys(before.security.intelligence.products)).toHaveLength(1);
    expect(selectStandingTaskings(loaded)).toEqual(selectStandingTaskings(before));
    expect(selectCollectionProducts(loaded)).toEqual(selectCollectionProducts(before));
    expect(loaded.security.intelligence.archive).toEqual(Object.values(before.security.intelligence.products));
    expect(loaded.security.intelligence.shares).toEqual([]);

    expect(Object.keys(before.cases ?? {})).toHaveLength(1);
    expect(loaded.cases?.["fixture-foreign-request"]?.history).toEqual(before.cases?.["fixture-foreign-request"]?.history);
    expect(loaded.cases?.["fixture-foreign-request"]?.status).toBe("declined");
    const caseHistory = before.cases?.["fixture-foreign-request"]?.history;
    expect(caseHistory?.map((step) => step.actor)).toEqual(["world", "player"]);
    for (const step of caseHistory ?? []) {
      if (!step.causeId) throw new Error("historical case transition lost its cause");
      expect(recordEntry(loaded, step.causeId)?.description).toBe(recordEntry(before, step.causeId)?.description);
      expect(recordEntry(loaded, step.causeId)?.actor).toBe(step.actor);
    }
    expect(Object.keys(before.commitments).length).toBeGreaterThan(0);
    expect(selectCommitments(before, before.founding.nation).length).toBeGreaterThan(0);
    expect(selectCommitments(loaded, loaded.founding.nation)).toEqual(selectCommitments(before, before.founding.nation));

    const caused = before.ledger.find((entry) => (entry.causal?.causeIds?.length ?? 0) > 0);
    expect(caused?.causal?.eventId).toBeDefined();
    expect(loaded.ledger).toEqual(before.ledger);
    expect(selectCausesOf(before.ledger, caused!.causal!.eventId).length).toBeGreaterThan(0);
    expect(selectCausesOf(loaded.ledger, caused!.causal!.eventId)).toEqual(selectCausesOf(before.ledger, caused!.causal!.eventId));
  });
});
