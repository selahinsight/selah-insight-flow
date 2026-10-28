import { SELAH_CONTACT_COPY, SELAH_KAKAO_CHANNEL_URL } from "@/lib/selah-contact";

type KakaoContactLinkProps = {
  variant?: "footer" | "checkout" | "policy";
};

function KakaoTalkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="selah-kakao-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3.25c-5.25 0-9.5 3.36-9.5 7.5 0 2.67 1.78 5.02 4.46 6.35l-.8 2.93c-.1.37.32.67.64.45l3.5-2.34c.55.07 1.12.11 1.7.11 5.25 0 9.5-3.36 9.5-7.55s-4.25-7.5-9.5-7.5Z"
        fill="currentColor"
      />
      <circle cx="8.5" cy="10.75" r="1" fill="white" />
      <circle cx="12" cy="10.75" r="1" fill="white" />
      <circle cx="15.5" cy="10.75" r="1" fill="white" />
    </svg>
  );
}

export function KakaoContactLink({ variant = "footer" }: KakaoContactLinkProps) {
  return (
    <aside className={`selah-kakao-contact selah-kakao-contact--${variant}`}>
      <p>{SELAH_CONTACT_COPY}</p>
      <a href={SELAH_KAKAO_CHANNEL_URL} target="_blank" rel="noreferrer">
        <KakaoTalkIcon />
        카카오톡 채널 문의
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
      aria-label="셀라인사이트 카카오톡 채널로 문의하기"
    >
      <KakaoTalkIcon size={22} />
    </a>
  );
}
