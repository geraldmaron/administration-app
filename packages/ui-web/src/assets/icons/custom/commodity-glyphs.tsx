import { makeGlyph } from "./make-glyph.js";

/** An oil barrel in profile: the unrefined commodity, distinct from the pump that stands for refined fuel. */
export const CrudeBarrelIcon = makeGlyph({
  name: "CrudeBarrel",
  body: "M64 36H192C204 56 208 92 208 128C208 164 204 200 192 220H64C52 200 48 164 48 128C48 92 52 56 64 36Z",
  detail: "M52 84H204M52 172H204",
});
