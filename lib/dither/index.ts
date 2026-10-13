/**
 * dither-core: the shared engine behind every dithercn component.
 * Import from `@/lib/dither`.
 */

export {
  BAYER_2,
  BAYER_4,
  BAYER_8,
  BLUE_NOISE_64,
  DITHER_MATRICES,
  getThresholdMap,
  isInked,
  thresholdAt,
} from "@/lib/dither/matrices";
export type { DitherMatrix, ThresholdMap } from "@/lib/dither/matrices";

export { cssColor, DEFAULT_PALETTE, MOTION } from "@/lib/dither/tokens";
export type { DitherColor, DitherPalette, Rgba } from "@/lib/dither/tokens";

export {
  readDitherCell,
  resolveColor,
  subscribeToTheme,
  useDitherColors,
} from "@/lib/dither/color";

export {
  useDocumentVisible,
  useFrameLoop,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither/motion";
export type {
  FrameLoopCallback,
  FrameLoopOptions,
  FrameLoopState,
} from "@/lib/dither/motion";

export { DitherShader, MAX_LIVE_CONTEXTS } from "@/lib/dither/shader";
export type {
  DitherShaderProps,
  DitherShaderState,
  DitherUniforms,
  ShaderUniformValue,
} from "@/lib/dither/shader";

export {
  DitherPattern,
  ditherMask,
  ditherMaskStyle,
  ditherPath,
} from "@/lib/dither/pattern";
export type {
  DitherMaskOptions,
  DitherMaskStyleOptions,
  DitherPatternProps,
} from "@/lib/dither/pattern";

export { DITHER_METHODS, ditherImage } from "@/lib/dither/diffuse";
export type {
  DiffuseOptions,
  DiffusionMethod,
  DiffusionOptions,
  DitherMethod,
  ImagePalette,
  OrderedMethod,
  OrderedOptions,
  PaletteColor,
  PixelBuffer,
} from "@/lib/dither/diffuse";
