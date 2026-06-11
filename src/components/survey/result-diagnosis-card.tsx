import { forwardRef } from "react";
import type { Survey, ResultType } from "@/lib/survey-store";
import { THEMES, fontFamilyOf, type DesignSettings } from "@/lib/survey-themes";

interface Props {
  survey: Survey;
  result: ResultType;
  design: DesignSettings;
}

/**
 * 1080x1350 portrait diagnostic result card.
 * Contains: SELAH brand, survey title, result type name, summary, description, verse.
 * Never includes raw respondent answers.
 */
export const ResultDiagnosisCard = forwardRef<HTMLDivElement, Props>(
  function ResultDiagnosisCard({ survey, result, design }, ref) {
    const t = THEMES[design.theme];
    const verse = result.bibleVerse ?? survey.bible_verse;
    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          backgroundColor: t.bg,
          color: t.text,
          fontFamily: fontFamilyOf(design.font_mood),
          padding: 80,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -140,
            right: -140,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${t.accent}18, transparent 70%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="36" height="36" viewBox="0 0 40 40">
            <path
              d="M20 4 C 30 8, 36 16, 32 26 C 28 34, 16 36, 10 30 C 4 24, 6 12, 14 8 C 18 6, 22 4, 20 4 Z"
              fill="none"
              stroke={t.accent}
              strokeWidth="1.4"
            />
          </svg>
          <span
            style={{
              fontSize: 18,
              letterSpacing: "0.42em",
              color: t.accent,
              fontWeight: 500,
            }}
          >
            SELAH
          </span>
        </div>

        <div
          style={{
            fontSize: 22,
            marginTop: 14,
            color: t.muted,
            letterSpacing: "0.12em",
          }}
        >
          {survey.title}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 24 }}>
          <div style={{ fontSize: 26, color: t.muted }}>당신의 결과는</div>
          <div
            style={{
              fontSize: 86,
              lineHeight: 1.15,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: t.text,
              marginTop: 12,
            }}
          >
            {result.title}
          </div>

          {result.summary && (
            <div
              style={{
                fontSize: 32,
                lineHeight: 1.55,
                marginTop: 28,
                color: t.text,
                opacity: 0.8,
                maxWidth: 820,
              }}
            >
              {result.summary}
            </div>
          )}

          {result.description && (
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.65,
                marginTop: 32,
                color: t.text,
                opacity: 0.75,
                maxWidth: 860,
                whiteSpace: "pre-wrap",
              }}
            >
              {result.description}
            </div>
          )}

          {verse && (
            <div
              style={{
                marginTop: 44,
                padding: "28px 32px",
                borderLeft: `3px solid ${t.accent}`,
                fontSize: 24,
                fontStyle: "italic",
                color: t.text,
                opacity: 0.9,
                maxWidth: 860,
                backgroundColor: t.surface,
                borderRadius: 8,
              }}
            >
              “{verse}”
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 28,
            borderTop: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: 20, color: t.muted, letterSpacing: "0.06em" }}>
            나도 진단해보기 · /s/{survey.slug}
          </div>
          <div style={{ fontSize: 18, color: t.muted, letterSpacing: "0.32em" }}>
            SELAH · INSIGHT
          </div>
        </div>
      </div>
    );
  },
);
