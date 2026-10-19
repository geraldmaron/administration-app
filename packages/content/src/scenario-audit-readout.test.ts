import { describe, expect, it } from "vitest";
import type { ScenarioDef } from "./scenario.js";
import {
  auditEssayisticColon,
  auditFigurelessReadout,
  auditOpaqueJargon,
  auditPlaceAsActor,
  auditSpelledParticular,
} from "./scenario-audit-readout.js";

type Finding = { readonly kind: string; readonly severity: string; readonly scenario: string; readonly message: string };

function sink(): Finding[] & { push(f: Finding): void } {
  return [] as Finding[] & { push(f: Finding): void };
}

/** Only the fields the readout rules read. The gate's other rules are not under test here. */
function def(patch: Partial<ScenarioDef>): ScenarioDef {
  return { id: "under-test", particulars: [], ...patch } as ScenarioDef;
}

function context(patch: Record<string, unknown>): ScenarioDef {
  return def({ context: { standing: "", precedent: "", inaction: "", unknown: "", pressures: [], ...patch } } as never);
}

describe("spelled particulars", () => {
  it("rejects a count written out in words", () => {
    const findings = sink();
    auditSpelledParticular(def({ particulars: [{ label: "Days occupied", value: "Twelve" }] } as never), findings);
    expect(findings.map((f) => f.kind)).toEqual(["spelled-particular"]);
    expect(findings[0]!.severity).toBe("error");
  });

  it("rejects a hedged count written out in words", () => {
    const findings = sink();
    auditSpelledParticular(def({ particulars: [{ label: "Tents", value: "Over two hundred" }] } as never), findings);
    expect(findings.map((f) => f.kind)).toEqual(["spelled-particular"]);
  });

  it("accepts a numeral", () => {
    const findings = sink();
    auditSpelledParticular(def({ particulars: [{ label: "Days occupied", value: "12" }] } as never), findings);
    expect(findings).toHaveLength(0);
  });

  // "None" is an honest reading of an empty count and stays a word: a "0"
  // there would read as a measurement rather than an absence.
  it("accepts an absence stated as a word", () => {
    const findings = sink();
    auditSpelledParticular(def({ particulars: [{ label: "Arrests so far", value: "None" }] } as never), findings);
    expect(findings).toHaveLength(0);
  });

  // The rule anchors to the start of the value for exactly this case: "one"
  // here is a pronoun, not a figure written out.
  it("does not read a pronoun as a spelled figure", () => {
    const findings = sink();
    auditSpelledParticular(def({ particulars: [{ label: "Offer", value: "Above the last one" }] } as never), findings);
    expect(findings).toHaveLength(0);
  });

  it("warns when a figure is present but hedged", () => {
    const findings = sink();
    auditSpelledParticular(def({ particulars: [{ label: "Tents", value: "Over 200" }] } as never), findings);
    expect(findings.map((f) => [f.kind, f.severity])).toEqual([["hedged-particular", "warning"]]);
  });
});

describe("figureless readout", () => {
  it("rejects a scenario whose particulars carry no numeral", () => {
    const findings = sink();
    auditFigurelessReadout(def({ particulars: [{ label: "Cause", value: "Pending" }] } as never), findings);
    expect(findings.map((f) => f.kind)).toEqual(["figureless-readout"]);
  });

  it("accepts a scenario with one numeral among several particulars", () => {
    const findings = sink();
    auditFigurelessReadout(
      def({ particulars: [{ label: "Cause", value: "Pending" }, { label: "Days", value: "12" }] } as never),
      findings,
    );
    expect(findings).toHaveLength(0);
  });
});

describe("the essayistic colon", () => {
  it("rejects the colon-then-three-clauses figure", () => {
    const findings = sink();
    auditEssayisticColon(
      context({
        precedent:
          "Governments have learned the same lesson twice over: the operation is short, the photographs are permanent, and the officers answer for years.",
      }),
      findings,
    );
    expect(findings.map((f) => [f.kind, f.severity])).toEqual([["essayistic-triad", "error"]]);
  });

  it("warns on a plain clause-joining colon without reporting it twice", () => {
    const findings = sink();
    auditEssayisticColon(context({ standing: "There is no deadline and that is the difficulty: nothing forces a decision." }), findings);
    expect(findings.map((f) => [f.kind, f.severity])).toEqual([["essayistic-colon", "warning"]]);
  });

  it("leaves a colon introducing a noun alone", () => {
    const findings = sink();
    auditEssayisticColon(context({ standing: "Two things are outstanding: The tables and the annex." }), findings);
    expect(findings).toHaveLength(0);
  });

  it("reads every context passage, not only the first", () => {
    const findings = sink();
    auditEssayisticColon(context({ pressures: [{ source: "cabinet", want: "He wants him producing: the value decays." }] }), findings);
    expect(findings.map((f) => f.kind)).toEqual(["essayistic-colon"]);
  });
});

describe("places given a chain of command", () => {
  it("rejects a possessive place employing officers", () => {
    const findings = sink();
    auditPlaceAsActor(context({ inaction: "The plaza's commanders are working to an order that lapses." }), findings);
    expect(findings.map((f) => [f.kind, f.severity])).toEqual([["place-as-actor", "error"]]);
    expect(findings[0]!.message).toContain("the officers on the plaza");
  });

  it("accepts people pointed at by where they are", () => {
    const findings = sink();
    auditPlaceAsActor(context({ inaction: "The officers on the plaza are working to an order that lapses." }), findings);
    expect(findings).toHaveLength(0);
  });
});

describe("opaque operational jargon", () => {
  it("warns once per passage on a compressed act", () => {
    const findings = sink();
    auditOpaqueJargon(context({ precedent: "Governments have learned the same lesson from night clearances." }), findings);
    expect(findings.map((f) => [f.kind, f.severity])).toEqual([["opaque-jargon", "warning"]]);
  });

  it("leaves the act written out in plain words alone", () => {
    const findings = sink();
    auditOpaqueJargon(context({ precedent: "Governments that have sent officers into a square after dark have learned the same lesson." }), findings);
    expect(findings).toHaveLength(0);
  });
});
