import { forwardRef } from "react";
import type { Survey } from "@/lib/survey-store";
import {
  THEMES,
  bodyFamilyOf,
  headingFamilyOf,
  type DesignSettings,
} from "@/lib/survey-themes";

interface Props {
  survey: Survey;
  design: DesignSettings;
  qrDataUrl?: string;
}

/**
 * 1080x1350 Instagram-portrait share card.
 * Contains ONLY brand + title + summary + keywords + encouragement + CTA + QR.
 * Never includes respondent answers, personal info, or raw URL text.
 */
export const ResultShareCard = forwardRef<HTMLDivElement, Props>(
  function ResultShareCard({ survey, design, qrDataUrl }, ref) {
    const t = THEMES[design.theme];
    const headingFont = headingFamilyOf(design.font_mood);
    const bodyFont = bodyFamilyOf(design.font_mood);
    const sc = survey.share_card ?? { enabled: true };
    const summary = sc.summary ?? "지금의 나를 살펴본 시간";
    const description =
      sc.description ??
      "잠시 멈춰 마음을 들여다본 짧은 여백이었습니다.";
    const hashtags = sc.hashtags?.length ? sc.hashtags : ["감정정리", "회복", "마음의여백"];
    const encouragement = sc.encouragement ?? "당신의 속도로, 회복은 이미 시작되고 있어요.";
    const ctaText = sc.cta_text ?? "나도 진단해보기";
    const showVerse =
      sc.include_verse !== false &&
      survey.audience_type === "christian" &&
      !!survey.bible_verse;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          backgroundColor: t.bg,
          color: t.text,
          fontFamily: bodyFont,
          position: "relative",
          padding: 80,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* corner ornaments */}
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${t.accent}22, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -120,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${t.accent}11, transparent 70%)`,
          }}
        />

        {/* Brand */}
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

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 40 }}>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.15,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: t.text,
              fontFamily: headingFont,
            }}
          >
            {summary}
          </div>

          <div
            style={{
              fontSize: 32,
              lineHeight: 1.55,
              marginTop: 40,
              color: t.text,
              opacity: 0.78,
              maxWidth: 820,
              fontFamily: bodyFont,
            }}
          >
            {description}
          </div>

          {/* keywords */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 56 }}>
            {hashtags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  fontSize: 26,
                  padding: "14px 28px",
                  borderRadius: 999,
                  backgroundColor: t.surface,
                  border: `1px solid ${t.border}`,
                  color: t.accent,
                }}
              >
                #{tag}
              </div>
            ))}
          </div>

          {showVerse && (
            <div
              style={{
                marginTop: 56,
                padding: "28px 32px",
                borderLeft: `3px solid ${t.accent}`,
                fontSize: 26,
                fontStyle: "italic",
                color: t.text,
                opacity: 0.85,
                maxWidth: 820,
                fontFamily: headingFont,
              }}
            >
              “{survey.bible_verse}”
            </div>
          )}

          <div
            style={{
              marginTop: showVerse ? 40 : 64,
              fontSize: 28,
              color: t.muted,
              maxWidth: 820,
              lineHeight: 1.5,
            }}
          >
            {encouragement}
          </div>
        </div>

        {/* Footer CTA + QR */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 32,
            borderTop: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 26, color: t.text, fontFamily: headingFont }}>
              {ctaText}
            </div>
            <div style={{ fontSize: 16, color: t.muted, letterSpacing: "0.32em" }}>
              SELAH · INSIGHT
            </div>
          </div>
          {qrDataUrl && (
            <div
              style={{
                width: 160,
                height: 160,
                padding: 12,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                border: `1px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={qrDataUrl} alt="" style={{ width: "100%", height: "100%" }} />
            </div>
          )}
        </div>
      </div>
    );
  },
);
