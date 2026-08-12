import { Fragment } from "react";
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
  "편안한 신앙 연결형": "기도와 말씀을 일상의 돈 관리에\n자연스럽게 연결하는 편이에요.",
  "신앙부담형": "하나님 앞에서 바른 선택을 하고 싶은 마음이 커서, 돈을 쓸 때 부담을 느끼는 편이에요.",
  "신앙분리형": "돈 결정을 기도와 말씀에 연결하기보다,\n현실적인 기준으로 판단하는 편이에요.",
  "신앙·돈 기준 혼란형": "돈을 쓸 때 말씀을 어떻게 적용할지 몰라,\n마음이 자주 흔들리는 편이에요.",
};

const moneyDefinitions: Record<string, string> = {
  "확인긴장형": "미래를 충분히 준비하지 못했을까 걱정해,\n돈을 확인할 때 마음이 무거워지는 편이에요.",
  "평가부담형": "남들처럼 갖추고 싶어서 샀는데,\n카드값이 얼마나 나왔을지 확인하기가 겁나.",
  "회피위로형": "돈을 확인하는 일은 미루고,\n답답한 마음은 소비로 달래는 편이에요.",
  "기준압박형": "미래를 든든하게 준비하면서,\n남들처럼 잘 갖추고 싶은 마음도\n큰 편이에요.",
  "긴장보상형": "미래가 걱정돼 평소에는 지출을 줄이지만,\n답답함이 쌓이면 한꺼번에 돈을 쓰는 편이에요.",
  "비교위로형": "다른 사람과 비교해\n내 모습이 부족하게 느껴지면,\n속상한 마음을 달래려고\n계획에 없던 돈까지 쓰는 편이에요.",
  "불안보상형": "미래의 돈은 걱정되고,\n현재 돈을 확인하기는 두려워\n쌓인 불안을 소비로 달래는 편이에요.",
  "평가불안형": "다른 사람과 비교하며\n계획보다 돈을 쓴 후,\n미래 준비가 불안해져\n확인과 정리를 미루는 편이에요.",
  "전반적 복합반응형": "돈을 어떻게 모으고 써야 할지\n기준을 잡기 어려워\n혼란을 느끼는 편이에요.",
  "정리미룸형": "잔고를 확인하면 마음이 무거워져,\n확인과 정리를 뒤로 미루는 편이에요.",
  "안전추구형": "아무리 준비해도 부족할까 봐,\n마음을 놓기 어려운 편이에요.",
  "시선민감형": "다른 사람과 내 삶을 비교하며,\n나도 비슷하게 갖고 싶어지는 편이에요.",
  "마음보상형": "마음이 지칠수록,\n소비로 나를 달래는 편이에요.",
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

function FlowCards({ content, theme, steps }: { content: SelahMoneyResultTemplateContent; theme: ThemeColors; steps?: string[] }) {
  const flowSteps = steps ?? content.flow;

  return (
    <ol className="money-editorial-flow-cards">
      {flowSteps.map((step) => (
        <li key={step} style={{ color: theme.text, borderColor: `${theme.accent}3D` }}>
          {step.split("\n").map((line, index, lines) => (
            <Fragment key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 && <br />}
            </Fragment>
          ))}
        </li>
      ))}
    </ol>
  );
}

function ActionCards({ content, theme, showNumbers = true, items }: { content: SelahMoneyResultTemplateContent; theme: ThemeColors; showNumbers?: boolean; items?: string[] }) {
  const checklistItems = items ?? content.checklist;

  return (
    <div className="money-editorial-actions">
      {checklistItems.map((item, index) => (
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
  const faithFlow = faithContent.title === "신앙부담형"
    ? [
        "돈을 쓰거나 누릴 일이 생김",
        "하나님 앞에서 바른 선택인지\n여러 번 점검함",
        "부담과 죄책감이 올라와 선택이 조심스러워짐",
      ]
    : [faithContent.flow[0], faithContent.flow[Math.floor(faithContent.flow.length / 2)], faithContent.flow.at(-1)].filter((step): step is string => Boolean(step));
  const moneyAction = moneyContent.title === "정리미룸형"
    ? "통장 앱을 열어 현재 잔액만 먼저 확인해보세요."
    : moneyContent.checklist[0];
  const integratedChecklist = [moneyAction, faithContent.checklist[0]].filter((item): item is string => Boolean(item));
  const moneyBody = moneyContent.reading.slice(1).join(" ");
  const faithBody = faithContent.reading.slice(1).join(" ");
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

      <section className="money-editorial-hero money-editorial-primary-hero" style={{ borderColor: `${theme.accent}55`, backgroundColor: theme.bg }}>
        <p className="money-editorial-eyebrow" style={{ color: theme.accent }}>{name}님의 주된 돈 반응 유형</p>
        <h2 style={{ color: theme.text }}>{moneyContent.title}</h2>
        <p className="money-editorial-definition" style={{ color: theme.text }}>
          {(moneyDefinitions[moneyContent.title] ?? moneyContent.reading[0]).split("\n").map((line) => <span key={line}>{line}</span>)}
        </p>
        <div className="money-editorial-ornament money-editorial-primary-ornament" style={{ color: theme.accent }} aria-hidden="true">
          <span />
          <CircleDollarSign size={22} strokeWidth={1.35} />
          <span />
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
        <p className="money-editorial-reading-lead" style={{ color: theme.text }}>{moneyContent.reading[0]}</p>
        {moneyBody && <p className="money-editorial-reading-body" style={{ color: theme.text }}>{moneyBody}</p>}
      </section>

      <section className="money-editorial-faith-transition">
        <p style={{ color: theme.text }}>그렇다면<br />나는 하나님 앞에서 돈을 어떻게 바라보고 있을까요?</p>
      </section>

      <section className="money-editorial-hero money-editorial-faith-hero" style={{ borderColor: `${theme.accent}55`, backgroundColor: theme.bg }}>
        <div className="money-editorial-ornament" style={{ color: theme.accent }} aria-hidden="true">
          <span />
          <Heart size={22} strokeWidth={1.35} />
          <span />
        </div>
        <p className="money-editorial-eyebrow" style={{ color: theme.accent }}>{name}님의 돈을 대하는 신앙 유형</p>
        <h2 style={{ color: theme.text }}>{faithTitle}</h2>
        <div className="money-editorial-heart-panel" style={{ borderColor: `${theme.accent}30` }}>
          <MessageCircleMore className="money-editorial-thought-mark" size={28} strokeWidth={1.35} aria-hidden="true" />
          <HeartQuote content={faithContent} accent={theme.text} />
        </div>
        <p className="money-editorial-definition" style={{ color: theme.text }}>
          {(faithDefinitions[faithContent.title] ?? faithContent.reading[0]).split("\n").map((line) => <span key={line}>{line}</span>)}
        </p>
      </section>

      <section className="money-editorial-section money-editorial-flow money-editorial-faith-flow">
        <div className="money-editorial-heading" style={{ color: theme.text }}>
          <Sparkles size={20} strokeWidth={1.6} style={{ color: theme.accent }} />
          <h3>내 마음은 이렇게 흘러가요</h3>
        </div>
        <FlowCards content={faithContent} theme={theme} steps={faithFlow} />
      </section>

      <section className="money-editorial-section money-editorial-reading money-editorial-faith-reading">
        <p className="money-editorial-reading-lead" style={{ color: theme.text }}>{faithContent.reading[0]}</p>
        {faithBody && <p className="money-editorial-reading-body" style={{ color: theme.text }}>{faithBody}</p>}
      </section>

      <section className="money-editorial-section money-editorial-action-section money-editorial-faith-action-section">
        <div className="money-editorial-action-card">
          <div className="money-editorial-heading" style={{ color: theme.text }}>
            <Sprout size={21} strokeWidth={1.6} style={{ color: theme.accent }} />
            <h3>이렇게 시작해보세요</h3>
          </div>
          <ActionCards content={faithContent} theme={theme} showNumbers={false} items={integratedChecklist} />
        </div>
      </section>

    </div>
  );
}
