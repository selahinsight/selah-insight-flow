// Selah Survey theme presets. Layout is fixed — only mood/colors switch.

export type ThemeKey =
  | "warm_ivory"
  | "soft_sage"
  | "clay_beige"
  | "dusty_rose"
  | "calm_blue"
  | "charcoal_minimal";

export type ButtonStyleKey = "filled" | "outline" | "soft";
export type CardStyleKey = "clean" | "soft_shadow" | "border_line";
export type FontMoodKey = "serif_point" | "clean_sans" | "calm_editorial";

export interface DesignSettings {
  theme: ThemeKey;
  button_style: ButtonStyleKey;
  card_style: CardStyleKey;
  font_mood: FontMoodKey;
}

export const DEFAULT_DESIGN: DesignSettings = {
  theme: "warm_ivory",
  button_style: "filled",
  card_style: "clean",
  font_mood: "serif_point",
};

export interface ThemeColors {
  label: string;
  bg: string;        // page background
  surface: string;   // card background
  text: string;
  muted: string;
  accent: string;    // buttons / primary
  accentText: string;
  border: string;
  progress: string;
  selected: string;  // selected option border/bg
  swatch: string[];  // small color palette for preview
}

export const THEMES: Record<ThemeKey, ThemeColors> = {
  warm_ivory: {
    label: "Warm Ivory",
    bg: "#F7F1E6",
    surface: "#FFFBF3",
    text: "#3D342B",
    muted: "#8A7B6B",
    accent: "#B97A5A",
    accentText: "#FFFFFF",
    border: "#E7DCC8",
    progress: "#C99A7A",
    selected: "#B97A5A",
    swatch: ["#F7F1E6", "#FFFBF3", "#B97A5A", "#C99A7A"],
  },
  soft_sage: {
    label: "Soft Sage",
    bg: "#EEF1E8",
    surface: "#F8FAF3",
    text: "#3A4438",
    muted: "#7E8A78",
    accent: "#7A9A78",
    accentText: "#FFFFFF",
    border: "#D7DECB",
    progress: "#9CB69A",
    selected: "#7A9A78",
    swatch: ["#EEF1E8", "#F8FAF3", "#7A9A78", "#9CB69A"],
  },
  clay_beige: {
    label: "Clay Beige",
    bg: "#EFE4D6",
    surface: "#FAF1E3",
    text: "#3B2F25",
    muted: "#8A7560",
    accent: "#A26A48",
    accentText: "#FFFFFF",
    border: "#DDCCB4",
    progress: "#C28A66",
    selected: "#A26A48",
    swatch: ["#EFE4D6", "#FAF1E3", "#A26A48", "#C28A66"],
  },
  dusty_rose: {
    label: "Dusty Rose",
    bg: "#F4E6E2",
    surface: "#FCF3F0",
    text: "#4A3434",
    muted: "#947878",
    accent: "#B7766F",
    accentText: "#FFFFFF",
    border: "#E7CFC9",
    progress: "#CC9890",
    selected: "#B7766F",
    swatch: ["#F4E6E2", "#FCF3F0", "#B7766F", "#CC9890"],
  },
  calm_blue: {
    label: "Calm Blue",
    bg: "#E6ECF1",
    surface: "#F4F7FA",
    text: "#2D3A47",
    muted: "#788794",
    accent: "#557A95",
    accentText: "#FFFFFF",
    border: "#CFD9E2",
    progress: "#7CA0BA",
    selected: "#557A95",
    swatch: ["#E6ECF1", "#F4F7FA", "#557A95", "#7CA0BA"],
  },
  charcoal_minimal: {
    label: "Charcoal Minimal",
    bg: "#1F1F1F",
    surface: "#2A2A2A",
    text: "#F2EEE6",
    muted: "#9A9388",
    accent: "#E8DCC4",
    accentText: "#1F1F1F",
    border: "#3A3A3A",
    progress: "#E8DCC4",
    selected: "#E8DCC4",
    swatch: ["#1F1F1F", "#2A2A2A", "#E8DCC4", "#9A9388"],
  },
};

export const BUTTON_STYLES: { value: ButtonStyleKey; label: string }[] = [
  { value: "filled", label: "Filled" },
  { value: "outline", label: "Outline" },
  { value: "soft", label: "Soft" },
];

export const CARD_STYLES: { value: CardStyleKey; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "soft_shadow", label: "Soft Shadow" },
  { value: "border_line", label: "Border Line" },
];

export const FONT_MOODS: { value: FontMoodKey; label: string; family: string }[] = [
  { value: "serif_point", label: "Serif Point", family: '"Noto Serif KR", "Cormorant Garamond", Georgia, serif' },
  { value: "clean_sans", label: "Clean Sans", family: '"Pretendard", "Inter", system-ui, sans-serif' },
  { value: "calm_editorial", label: "Calm Editorial", family: '"Noto Serif KR", "EB Garamond", "Pretendard", serif' },
];

export function fontFamilyOf(mood: FontMoodKey): string {
  return FONT_MOODS.find((f) => f.value === mood)?.family ?? FONT_MOODS[0].family;
}

export function buttonClasses(style: ButtonStyleKey, t: ThemeColors): React.CSSProperties {
  if (style === "outline") {
    return {
      backgroundColor: "transparent",
      color: t.accent,
      border: `1.5px solid ${t.accent}`,
    };
  }
  if (style === "soft") {
    return {
      backgroundColor: hexAlpha(t.accent, 0.15),
      color: t.accent,
      border: "none",
    };
  }
  return {
    backgroundColor: t.accent,
    color: t.accentText,
    border: "none",
  };
}

export function cardClasses(style: CardStyleKey, t: ThemeColors): React.CSSProperties {
  if (style === "soft_shadow") {
    return {
      backgroundColor: t.surface,
      border: "1px solid transparent",
      boxShadow: `0 12px 32px -16px ${hexAlpha(t.text, 0.18)}`,
    };
  }
  if (style === "border_line") {
    return {
      backgroundColor: t.surface,
      border: `1px solid ${t.border}`,
      boxShadow: "none",
    };
  }
  return {
    backgroundColor: t.surface,
    border: "1px solid transparent",
    boxShadow: "none",
  };
}

function hexAlpha(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// react import shim for CSSProperties type without React in scope
import type React from "react";
