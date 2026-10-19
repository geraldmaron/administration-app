export declare const motion: {
    readonly duration: {
        readonly fast: 120;
        readonly normal: 200;
        readonly detach: 280;
        readonly settle: 400;
    };
    readonly easing: {
        readonly standard: "cubic-bezier(0.2, 0, 0, 1)";
        readonly emphasized: "cubic-bezier(0.16, 1, 0.3, 1)";
        readonly exit: "cubic-bezier(0.4, 0, 1, 1)";
    };
};
export declare function resolveMotion<T>(value: T, reduceMotionEnabled: boolean, instantFallback: T): T;
export type MotionToken = typeof motion;
