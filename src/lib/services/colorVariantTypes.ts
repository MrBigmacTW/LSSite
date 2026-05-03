// Browser-safe constants & types for the color variant system.
// Import this in client components instead of colorVariantService.ts

export const VARIANT_TYPES = [
  "original",
  "negate",
  "warm",
  "cool",
  "grayscale",
  "vintage",
  "sketch",
  "pixelate",
  "oilpaint",
  "halftone",
  "emboss",
] as const;

export type VariantType = (typeof VARIANT_TYPES)[number];

export const VARIANT_LABELS: Record<VariantType, string> = {
  original:  "原色",
  negate:    "底片反色",
  warm:      "暖色調",
  cool:      "冷色調",
  grayscale: "灰階",
  vintage:   "復古棕",
  sketch:    "速寫線稿",
  pixelate:  "像素風",
  oilpaint:  "油畫質感",
  halftone:  "半調網點",
  emboss:    "浮雕壓紋",
};
