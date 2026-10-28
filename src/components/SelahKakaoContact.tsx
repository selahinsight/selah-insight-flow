import { MessageCircle } from "lucide-react";
import { SELAH_CONTACT_COPY, SELAH_KAKAO_CHANNEL_URL } from "@/lib/selah-contact";

type KakaoContactLinkProps = {
  variant?: "footer" | "checkout" | "policy";
};

export function KakaoContactLink({ variant = "footer" }: KakaoContactLinkProps) {
  return (
    <aside className={`selah-kakao-contact selah-kakao-contact--${variant}`}>
      <p>{SELAH_CONTACT_COPY}</p>
      <a href={SELAH_KAKAO_CHANNEL_URL} target="_blank" rel="noreferrer">
        <MessageCircle size={17} strokeWidth={2} aria-hidden="true" />
        셀라 인사이트 카톡 문의하기
      </a>
    </aside>
  );
}

export function SelahKakaoFloatingButton() {
  return (
    <a
      className="selah-kakao-floating"
      href={SELAH_KAKAO_CHANNEL_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="셀라 인사이트 카카오톡 채널로 문의하기"
    >
      <MessageCircle size={19} strokeWidth={2.1} aria-hidden="true" />
      <span>카톡 문의</span>
    </a>
  );
}
