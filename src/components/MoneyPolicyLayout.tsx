import type { ReactNode } from "react";

type MoneyPolicyLayoutProps = {
  children: ReactNode;
  title: string;
};

export function MoneyPolicyLayout({ children, title }: MoneyPolicyLayoutProps) {
  return (
    <div className="money-policy-page">
      <header>
        <a href="/" aria-label="셀라 인사이트 홈">SELAH INSIGHT</a>
        <h1>{title}</h1>
        <p>시행일: 2026년 10월 13일</p>
      </header>
      <main>{children}</main>
      <footer>
        <a href="/terms">이용약관</a>
        <a href="/refund">취소·환불 규정</a>
        <a href="https://selahinsight.co.kr/privacy">개인정보처리방침</a>
      </footer>
    </div>
  );
}
