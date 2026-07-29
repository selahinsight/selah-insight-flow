import type { ThemeColors } from "@/lib/survey-themes";
import type { SelahMoneyResultTemplateContent } from "@/lib/selah-money-result-template";

interface SelahMoneyResultTemplateProps {
  content: SelahMoneyResultTemplateContent;
  theme: ThemeColors;
}

// 결과지 템플릿 v1
// 유형명 아래 대표 마음 → 마음 흐름 → 공감 설명 → 실용 체크리스트 순서를 고정합니다.
export function SelahMoneyResultTemplate({ content, theme }: SelahMoneyResultTemplateProps) {
  return (
    <>
      <p className="money-result-bubble" style={{ marginTop: 18, fontSize: 15, color: theme.accent, textAlign: "center" }}>
        “{content.representativeHeart.map((line, index) => (
          <span key={line}>
            {line}
            {index < content.representativeHeart.length - 1 && <br />}
          </span>
        ))}”
      </p>
      <div style={{ marginTop: 18, padding: 18, borderRadius: 8, backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
        <div className="money-unified-summary">
          <section>
            <h3>이 유형의 마음을 살펴보면,</h3>
            <div className="money-flow-steps">
              {content.flow.map((step, index) => (
                <div key={step}>
                  <div className="money-flow-step" style={{ color: theme.text, borderColor: theme.border }}>
                    {step.includes("\n")
                      ? step.split("\n").map((line) => (
                          <span key={line} style={{ display: "block", whiteSpace: "nowrap" }}>
                            {line}
                          </span>
                        ))
                      : step}
                  </div>
                  {index < content.flow.length - 1 && <div className="money-flow-arrow" style={{ color: theme.accent }}>↓</div>}
                </div>
              ))}
            </div>
            <div className="money-unified-reading">
              {content.reading.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
          <section className="money-unified-checklist">
            <h3>{content.checklistTitle ?? "지금 확인해보세요"}</h3>
            <ul>
              {content.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
