// Interface motion, in milliseconds. The camera's own timing (fly, quick,
// cut) belongs to the map; these are the panel, sheet and control moves.
// Under reduced motion every duration is zero.

export const motion = {
  duration: {
    fast: 120,
    normal: 200,
    detach: 280,
    settle: 400,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;

export function resolveMotion<T>(value: T, reduceMotionEnabled: boolean, instantFallback: T): T {
  return reduceMotionEnabled ? instantFallback : value;
}

export type MotionToken = typeof motion;
