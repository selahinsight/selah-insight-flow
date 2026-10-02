import { ArrowRight } from "lucide-react";

const MONEY_STUDY_URL = "https://selahinsight.co.kr/money-study";

export function MoneyStudyCourseFooter() {
  return (
    <footer className="money-product-course-footer">
      <span>SELAH MONEY STUDY</span>
      <h2>셀라의 돈 공부 전체 과정 보기</h2>
      <p>
        무료 진단부터 심층 리포트와 워크북까지,
        <br />나에게 맞는 돈 공부의 흐름을 확인해보세요.
      </p>
      <a href={MONEY_STUDY_URL}>
        전체 과정 보기 <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
      </a>
    </footer>
  );
}
