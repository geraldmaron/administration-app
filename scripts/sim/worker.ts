// One child process, one campaign at a time.
//
// A week of this game costs about half a second of pure arithmetic — almost all
// of it `apply()` folding the grudge-decay packet over every relationship on the
// board — so a sweep of a hundred campaigns is an hour on one core and a few
// minutes across the machine. Forking is the only reason this harness is
// re-runnable rather than an overnight job.
import { loadPool } from "./corpus-pool.ts";
import type { PoolName } from "./corpus-pool.ts";
import { playCampaign } from "./play.ts";
import type { Archetype } from "./policies.ts";
import type { ForecastCalibration } from "./play.ts";

export type Job = {
  readonly seed: string;
  readonly archetype: Archetype;
  readonly poolName: PoolName;
  readonly horizon: number;
  readonly calibration?: ForecastCalibration;
};

const pools = new Map<PoolName, ReturnType<typeof loadPool>>();

function poolFor(name: PoolName) {
  const cached = pools.get(name);
  if (cached) return cached;
  const loaded = loadPool(name);
  pools.set(name, loaded);
  return loaded;
}

process.on("message", async (job: Job) => {
  const loaded = poolFor(job.poolName);
  const result = await playCampaign(job.seed, job.archetype, loaded.pool, job.poolName, job.horizon, job.calibration);
  process.send?.(result);
});

// A worker with no parent to talk to is a bug, not a mode.
if (!process.send) {
  throw new Error("sim worker must be forked with an IPC channel");
}
