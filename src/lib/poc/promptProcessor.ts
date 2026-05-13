/**
 * Function call params → 英文 Z-Image prompt
 * 所有參數由 Gemini 直接填英文，這裡只做拼接
 */

export interface DesignParams {
  style: string;
  subject: string;
  text_overlay?: string;
  color_palette: string;
  mood: string;
  composition?: string;
}

const FIXED_SUFFIX = [
  "T-shirt design",
  "vector style illustration",
  "transparent background",
  "clean composition",
  "print-ready quality",
  "high resolution",
  "no extra elements",
];

export function buildZImagePrompt(params: DesignParams): string {
  const parts: (string | null | undefined)[] = [
    params.style,
    `featuring ${params.subject}`,
    params.text_overlay ? `with text "${params.text_overlay}"` : null,
    `${params.color_palette} color palette`,
    `${params.mood} mood`,
    params.composition || "centered composition",
    ...FIXED_SUFFIX,
  ];
  return parts.filter(Boolean).join(", ");
}
