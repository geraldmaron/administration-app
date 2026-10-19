import { createAnimations } from "@tamagui/animations-react-native";
import { motion } from "@admin/design";

export const animations = createAnimations({
  fast: { type: "timing", duration: motion.duration.fast },
  normal: { type: "timing", duration: motion.duration.normal },
  settle: { type: "spring", damping: 22, stiffness: 220, mass: 1 },
});
