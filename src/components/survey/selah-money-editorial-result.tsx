import { Check, CircleDollarSign, Heart, MessageCircleMore, Sparkles, Sprout } from "lucide-react";

import type { SelahMoneyResultTemplateContent } from "@/lib/selah-money-result-template";
import type { ThemeColors } from "@/lib/survey-themes";

interface SelahMoneyEditorialResultProps {
  name: string;
  moneyContent: SelahMoneyResultTemplateContent;
  faithContent: SelahMoneyResultTemplateContent;
  faithTitle: string;
  theme: ThemeColors;
}

const faithDefinitions: Record<string, string> = {
  "편안한 신앙 연결형": "돈을 관리할 때 하나님께 묻고, 감사와 책임 안에서 선택하는 편이에요.",
  "신앙부담형": "하나님 앞에서 바른 선택을 하고 싶은 마음이 커서, 돈을 쓸 때 부담을 느끼는 편이에요.",
  "신앙분리형": "신앙과 돈을 서로 다른 영역으로 두고, 익숙한 기준으로 돈을 관리하는 편이에요.",
  "신앙·돈 기준 혼란형": "하나님과 돈을 연결하는 기준을 찾는 과정에서 마음이 자주 흔들리는 편이에요.",
};

function HeartQuote({ content, accent, lines }: { content: SelahMoneyResultTemplateContent; accent: string; lines?: string[] }) {
  const quoteLines = lines ?? content.representativeHeart;

  return (
    <blockquote className="money-editorial-quote" style={{ color: accent }}>
      <span aria-hidden="true">“</span>
      {quoteLines.map((line) => <span key={line}>{line}</span>)}
      <span aria-hidden="true">”</span>
    </blockquote>
  );
}

function FlowCards({ content, theme }: { content: SelahMoneyResultTemplateContent; theme: ThemeColors }) {
  return (
    <ol className="money-editorial-flow-cards">
      {content.flow.map((step) => (
        <li key={step} style={{ color: theme.text, borderColor: `${theme.accent}3D` }}>
          {step}
        </li>
      ))}
    </ol>
  );
}

function ActionCards({ content, theme, showNumbers = true }: { content: SelahMoneyResultTemplateContent; theme: ThemeColors; showNumbers?: boolean }) {
  return (
    <div className="money-editorial-actions">
      {content.checklist.map((item, index) => (
        <article key={item} style={{ borderColor: theme.border, backgroundColor: "rgba(255,255,255,0.5)" }}>
          <span className="money-editorial-action-icon" style={{ color: theme.accent, borderColor: `${theme.accent}55` }}>
            <Check size={15} strokeWidth={2} />
          </span>
          <div>
            {showNumbers && <strong style={{ color: theme.accent }}>{String(index + 1).padStart(2, "0")}</strong>}
            <p style={{ color: theme.text }}>{item}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SelahMoneyEditorialResult({ name, moneyContent, faithContent, faithTitle, theme }: SelahMoneyEditorialResultProps) {
  const scenes = moneyContent.sceneHook?.split("\n").map((line) => line.trim()).filter(Boolean) ?? [];

  return (
    <div className="money-editorial-result">
      {scenes.length > 0 && (
        <section className="money-editorial-section money-editorial-scene-section">
          <span className="money-editorial-scene-quote" style={{ color: theme.accent }} aria-hidden="true">“</span>
          <div className="money-editorial-heading" style={{ color: theme.text }}>
            <h3>혹시 이런 모습이 익숙한가요?</h3>
          </div>
          <div className="money-editorial-scenes">
            <p style={{ color: theme.text }}>{scenes.join("\n")}</p>
          </div>
        </section>
      )}

      <section className="money-editorial-hero" style={{ borderColor: `${theme.accent}55`, backgroundColor: theme.bg }}>
        <div className="money-editorial-ornament" style={{ color: theme.accent }} aria-hidden="true">
          <span />
          <CircleDollarSign size={22} strokeWidth={1.35} />
          <span />
        </div>
        <p className="money-editorial-eyebrow" style={{ color: theme.accent }}>{name}님의 주된 돈 반응 유형</p>
        <h2 style={{ color: theme.text }}>{moneyContent.title}</h2>
        <p className="money-editorial-definition" style={{ color: theme.text }}>마음이 지칠수록, 소비로 나를 달래는 편이에요.</p>
        <div className="money-editorial-heart-panel" style={{ borderColor: `${theme.accent}30` }}>
          <MessageCircleMore className="money-editorial-thought-mark" size={28} strokeWidth={1.35} aria-hidden="true" />
          <HeartQuote content={moneyContent} accent={theme.accent} lines={["오늘만큼은 나를 위해 써도", "괜찮지 않을까?"]} />
        </div>
      </section>

      <section className="money-editorial-section money-editorial-flow">
        <div className="money-editorial-heading" style={{ color: theme.text }}>
          <Sparkles size={20} strokeWidth={1.6} style={{ color: theme.accent }} />
          <h3>내 마음은 이렇게 흘러가요</h3>
        </div>
        <FlowCards content={moneyContent} theme={theme} />
      </section>

      <section className="money-editorial-section money-editorial-reading">
        {moneyContent.reading.map((paragraph, index) => (
          <p key={paragraph} className={index === 0 ? "money-editorial-reading-lead" : ""} style={{ color: theme.text }}>{paragraph}</p>
        ))}
      </section>

      <section className="money-editorial-section money-editorial-action-section">
        <div className="money-editorial-action-card">
          <div className="money-editorial-heading" style={{ color: theme.text }}>
            <Sprout size={21} strokeWidth={1.6} style={{ color: theme.accent }} />
            <h3>이렇게 시작해보세요</h3>
          </div>
          <ActionCards content={moneyContent} theme={theme} showNumbers={false} />
        </div>
      </section>

      <section className="money-editorial-faith-transition">
        <p style={{ color: theme.text }}>그렇다면 나는 하나님 앞에서<br />돈을 어떻게 바라보고 있을까요?</p>
      </section>

      <section className="money-editorial-section money-editorial-scene-section money-editorial-faith-scene">
        <span className="money-editorial-scene-quote" style={{ color: theme.accent }} aria-hidden="true">“</span>
        <div className="money-editorial-heading" style={{ color: theme.text }}>
          <h3>혹시 이런 모습이 익숙한가요?</h3>
        </div>
        <div className="money-editorial-scenes">
          <p style={{ color: theme.text }}>돈을 관리할 때,<br />하나님 앞에서 잘하고 있는지 걱정되나요?</p>
        </div>
      </section>

      <section className="money-editorial-hero money-editorial-faith-hero" style={{ borderColor: `${theme.accent}55`, backgroundColor: theme.bg }}>
        <div className="money-editorial-ornament" style={{ color: theme.accent }} aria-hidden="true">
          <span />
          <Heart size={22} strokeWidth={1.35} />
          <span />
        </div>
        <p className="money-editorial-eyebrow" style={{ color: theme.accent }}>{name}님의 돈을 대하는 신앙 유형</p>
        <h2 style={{ color: theme.text }}>{faithTitle}</h2>
        <p className="money-editorial-definition" style={{ color: theme.text }}>{faithDefinitions[faithContent.title] ?? faithContent.reading[0]}</p>
        <div className="money-editorial-heart-panel" style={{ borderColor: `${theme.accent}30` }}>
          <MessageCircleMore className="money-editorial-thought-mark" size={28} strokeWidth={1.35} aria-hidden="true" />
          <HeartQuote content={faithContent} accent={theme.accent} />
        </div>
      </section>

      <section className="money-editorial-section money-editorial-flow money-editorial-faith-flow">
        <div className="money-editorial-heading" style={{ color: theme.text }}>
          <Sparkles size={20} strokeWidth={1.6} style={{ color: theme.accent }} />
          <h3>내 마음은 이렇게 흘러가요</h3>
        </div>
        <FlowCards content={faithContent} theme={theme} />
      </section>

      <section className="money-editorial-section money-editorial-reading money-editorial-faith-reading">
        {faithContent.reading.map((paragraph, index) => (
          <p key={paragraph} className={index === 0 ? "money-editorial-reading-lead" : ""} style={{ color: theme.text }}>{paragraph}</p>
        ))}
      </section>

      <section className="money-editorial-section money-editorial-action-section money-editorial-faith-action-section">
        <div className="money-editorial-action-card">
          <div className="money-editorial-heading" style={{ color: theme.text }}>
            <Sprout size={21} strokeWidth={1.6} style={{ color: theme.accent }} />
            <h3>이렇게 시작해보세요</h3>
          </div>
          <ActionCards content={faithContent} theme={theme} showNumbers={false} />
        </div>
      </section>

      <section className="money-editorial-integration" style={{ borderColor: `${theme.accent}66`, backgroundColor: `${theme.accent}0D` }}>
        <p className="money-editorial-kicker" style={{ color: theme.accent }}>두 결과를 함께 살펴보면</p>
        <p style={{ color: theme.text }}>
          {name}님은 지친 마음을 소비로 돌보려는 경향과 돈을 사용한 뒤 하나님 앞에서 선택을 다시 점검하는 마음이 함께 움직입니다.
          소비 전에는 위로가 필요하고, 소비 후에는 부담이 커지는 흐름을 알아차릴 때 자신을 돌보는 방식과 돈의 기준을 함께 세울 수 있습니다.
        </p>
      </section>
    </div>
  );
}
