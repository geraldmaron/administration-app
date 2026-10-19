import { FIXTURE_SCENARIOS } from "@admin/content";
// Deterministic, no-network driver. Used to exercise the resumable-run
// contract without depending on a real agent session or API key.
//
// It emits a document that clears the publish gate by default, so a mock run
// exercises the same path a real one takes rather than a shape the gate would
// never see. Pass `output` to emit something else — that is how the gate's
// refusals get proven.
//
// The topics are added here rather than in the shared fixture: the fixtures are
// the corpus-shaped content every package audits against, and the corpus does
// not carry topics on most of its rows. `topics` is required of a NEW draft
// (scenarios/binding.ts), which is what a mock generation run is pretending to
// be, so the tag belongs on this driver's output and not on the fixture.
const MOCK_OUTPUT = [
    {
        ...FIXTURE_SCENARIOS[0],
        topics: ["diplomacy"],
        binding: {
            mechanisms: [
                {
                    reply: "answer-the-paper-with-paper",
                    metric: "standing",
                    because: "answering a border note in writing on the same night concedes that the reading was theirs to take",
                },
                {
                    reply: "answer-the-paper-with-paper",
                    metric: "treasury",
                    because: "the trucks are moved by paying the haulage backlog off the books rather than by reopening the crossing",
                },
            ],
        },
    },
];
export class MockDriver {
    failItemIds;
    output;
    name = "mock";
    constructor(failItemIds = new Set(), output = MOCK_OUTPUT) {
        this.failItemIds = failItemIds;
        this.output = output;
    }
    async runItem(item) {
        if (this.failItemIds.has(item.id)) {
            return { itemId: item.id, status: "failed", spendUsd: 0, error: "forced failure for test" };
        }
        return { itemId: item.id, status: "done", spendUsd: 0.005, output: this.output };
    }
}
