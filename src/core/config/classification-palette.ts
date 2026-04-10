/** Предопределённые цвета категорий (hex) для классификаций на графе и в настройках. */
export const CLASSIFICATION_COLOR_PALETTE = [
  "#4A90D9",
  "#50C878",
  "#FFB347",
  "#E056FD",
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#F38181",
  "#AA96DA",
  "#2ECC71",
  "#dff4e8",
  "#3498DB",
  "#E74C3C",
  "#e4d5d5",
] as const;

export type ClassificationPaletteColor =
  (typeof CLASSIFICATION_COLOR_PALETTE)[number];

const PALETTE_SET = new Set<string>(CLASSIFICATION_COLOR_PALETTE);

export function isPaletteColor(
  color: string,
): color is ClassificationPaletteColor {
  return PALETTE_SET.has(color);
}

export function defaultColorForIndex(
  index: number,
): ClassificationPaletteColor {
  return CLASSIFICATION_COLOR_PALETTE[
    index % CLASSIFICATION_COLOR_PALETTE.length
  ];
}
