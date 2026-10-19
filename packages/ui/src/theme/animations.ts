import { createAnimations } from "@tamagui/animations-css";
import { motion } from "@admin/design";

// The same three moves as the native driver, as CSS transitions on the web.
export const animations = createAnimations({
  fast: `${motion.duration.fast}ms ${motion.easing.standard}`,
  normal: `${motion.duration.normal}ms ${motion.easing.standard}`,
  settle: `${motion.duration.settle}ms ${motion.easing.emphasized}`,
});
