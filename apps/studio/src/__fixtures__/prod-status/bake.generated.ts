// A miniature of packages/player-core/src/content/bundled-corpus.generated.ts,
// in the layout `corpus build` writes, for the console's bake reader.

export type BundledShard = {
  readonly shardId: string;
  readonly sha256: string;
  readonly itemCount: number;
  readonly jsonl: string;
};

export const BUNDLED_CONTENT_SET_ID = "fixture-set";

export const BUNDLED_MANIFEST_REVISION = 3;

export const BUNDLED_SHARDS: readonly BundledShard[] = [
  {
    shardId: "culture-000",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    itemCount: 2,
    jsonl: "{\"id\": \"baked-one\", \"class\": \"culture\", \"severity\": \"routine\", \"subject\": \"Fixture scenario baked-one\", \"cast\": {\"pick\": \"none\"}, \"conditions\": [], \"weight\": 1}\n{\"id\": \"baked-two\", \"class\": \"culture\", \"severity\": \"routine\", \"subject\": \"Fixture scenario baked-two\", \"cast\": {\"pick\": \"none\"}, \"conditions\": [], \"weight\": 1}\n",
  },
  {
    shardId: "economy-000",
    sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    itemCount: 1,
    jsonl: "{\"id\": \"baked-three\", \"class\": \"economy\", \"severity\": \"routine\", \"subject\": \"Fixture scenario baked-three\", \"cast\": {\"pick\": \"none\"}, \"conditions\": [], \"weight\": 1}\n",
  },
];
