import { defineConfig } from "vitest/config";

/**
 * This group's tests are integration tests wearing unit-test clothes: a single
 * `runJob` case writes a job file, runs a driver, puts the output through the
 * whole scenario audit, and journals spend to disk. That is a second or so of
 * honest work per case on an idle machine, and several times that on a shared
 * CI runner executing every workspace package at once.
 *
 * Vitest's default five-second cap therefore asserts something these tests were
 * never written to assert — how fast the machine is — and it failed CI on four
 * cases that pass locally and pass on CI when run alone. A timeout is a
 * deadlock guard here, not a performance budget, so it is set far above the
 * work rather than just above it. Anything genuinely hung still fails.
 *
 * Thirty seconds was not far enough. Measured 2026-09-03: the session-driver
 * resume case runs in 8.4 and 8.76 seconds idle, and breached thirty twice
 * while a build and a gate sweep ran beside it — more than 3.4x its idle cost,
 * which is starvation rather than slowness. The suite's whole runtime on a
 * developer machine is about 18 seconds; the same suite took 348 seconds in
 * CI's last green run and 539 in the red one, sharing two cores with the
 * player app.
 *
 * CI no longer creates that case — the pipeline serializes packages and runs
 * this one in its own tier — so what is left to guard is a local
 * `pnpm run test`, which still runs four packages at once. Ninety seconds is
 * ten times the honest idle cost of the slowest case. Raising it again would be
 * the wrong answer to a third breach: at that point the case is doing real I/O
 * it could fake, and the fix is in the test rather than in this number.
 */
export default defineConfig({
  test: {
    testTimeout: 90_000,
    hookTimeout: 90_000,
  },
});
