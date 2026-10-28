import { ArrowRight } from "lucide-react";
import { KakaoContactLink } from "./SelahKakaoContact";

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
      <KakaoContactLink />
      <nav className="money-product-policy-links" aria-label="이용 정책">
        <a href="/terms">이용약관</a>
        <a href="/refund">취소·환불 규정</a>
        <a href="https://selahinsight.co.kr/privacy">개인정보처리방침</a>
      </nav>
      <div className="money-product-business-info">
        <span><strong>상호</strong> 셀라인사이트</span>
        <span><strong>대표</strong> 최성윤</span>
        <span><strong>사업자등록번호</strong> 664-05-03510</span>
        <span><strong>사업장 주소</strong> 경기도 군포시 산본로 296, 108동 816호</span>
        <a href="tel:07080648059"><strong>대표전화</strong> 070-8064-8059</a>
        <span><strong>통신판매업 신고번호</strong> 2026-경기군포-0753</span>
      </div>
    </footer>
  );
}
