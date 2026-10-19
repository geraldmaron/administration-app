export type NormalizedImage = {
    readonly filePath: string;
    readonly bytes: number;
    readonly mimeType: string;
};
export type NormalizeOptions = {
    /** The long edge of the finished image. */
    readonly edge: number;
    readonly maxBytes: number;
    /**
     * The shape to crop to before scaling. Square when omitted, which is what a
     * headshot wants; a dispatch photograph wants 16:9, and cropping to it here
     * rather than trusting the model to frame it means one wide image and one
     * square one come out of the same pipeline at their own correct shapes.
     */
    readonly aspect?: {
        readonly width: number;
        readonly height: number;
    };
};
/**
 * Square-crop, downscale and re-encode `source` to a WebP under `maxBytes`,
 * written beside it as `<name>.webp`. Returns undefined if no quality in the
 * ladder gets under the ceiling — an image that cannot meet the standard is a
 * defect in the image, not a reason to move the standard.
 *
 * Crop happens at the source's own resolution and scaling after it. The other
 * order takes a 512-pixel window out of a 1024-pixel image, which is a
 * close-up of the subject's face rather than the portrait that was generated.
 */
export declare function normalizeToStandard(source: string, options: NormalizeOptions): Promise<NormalizedImage | undefined>;
