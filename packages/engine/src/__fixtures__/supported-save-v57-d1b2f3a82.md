# Historical supported save fixture

`supported-save-v57-d1b2f3a82.json.gz` is a full save written by `createSave`
from commit `d1b2f3a82`. Both `packages/engine/src/save.ts` and its checked-in
`dist/save.js` declare schema 57 at that commit. The current loader supports 57.
The first candidate, `1213445ca`, declares v63 in source but v57 in checked-in
`dist`; its source build also fails on absent `credit-share.ts`,
`lobbying-person.ts`, `lobbying-copy.ts`, and `lobbying-due.ts`. No files from
another revision were mixed into this fixture.

From the repository root, reproduce it with these commands. The existing
`node_modules` supplies third-party dependencies; the explicit package-local
link keeps `@admin/world` inside the archived revision.

```bash
fixture_root=$(mktemp -d /private/tmp/supported-save-v57-XXXXXXXX)
git archive d1b2f3a82 package.json pnpm-lock.yaml tsconfig.base.json packages/world packages/engine | tar -x -C "$fixture_root"
ln -s "$PWD/node_modules" "$fixture_root/node_modules"
mkdir -p "$fixture_root/packages/engine/node_modules/@admin"
ln -s "$fixture_root/packages/world" "$fixture_root/packages/engine/node_modules/@admin/world"
cp scripts/fixtures/_generate-supported-v57.mjs "$fixture_root/generate.mjs"
(cd "$fixture_root" && node generate.mjs && gzip -n -9 -c save.json > save.json.gz)
shasum -a 256 "$fixture_root/save.json" "$fixture_root/save.json.gz"
```

The generator seals a seeded founding through `foundedForBalance`, tasks CIA
collection, signs and lifts a usable tariff, raises and declines a foreign
request through the case effects, then runs six full turns. The historical
writer produced 6,878 people, 76 institutions, 8,547 directed relationships,
one tasking and product, one closed case, 40 commitments, and 272 ledger
entries, 29 of which name a cause. Historical `loadSave` read it back.

SHA-256 of uncompressed JSON:
`7e1537b6ec314afb3e78b8a8d449920174825fd0375f42420b674b72480eb9ff`

SHA-256 of deterministic gzip:
`59f7c5d58ca0b54b3f12d92404c784cdc45824d7cfa05632a82d22788c434923`

The current loader intentionally adds Congress members and circuit seats. It
may change `currentRole` only for people affected by Congress reseating, and
migrates a Hill post's old `disposition` to that person's `tie.rapport`. The
fixture has no old Congress promises. The regression holds every other
preexisting person field and every unaffected tie exact, plus every
preexisting institution, all directed relationships, taskings and products,
the case history, commitments, and the entire causal ledger. The v57 save predates intelligence `archive` and
`shares`; loading copies its *existing* product into the archive and opens
shares empty. It has no earlier disclosure history to recover.
