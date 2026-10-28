export const SELAH_KAKAO_CHANNEL_URL = "https://pf.kakao.com/_pkXFX";

export const SELAH_CONTACT_COPY =
  "상품·결제·다운로드 및 이용 관련 문의는 셀라 인사이트 카카오톡 채널로 문의해 주세요.";

export const SELAH_NOREPLY_COPY =
  "본 메일은 발신 전용입니다. 문의는 셀라 인사이트 카카오톡 채널을 이용해 주세요.";

export function kakaoEmailContactHtml() {
  return `<div style="margin-top:28px;padding:22px 20px;border-radius:14px;background:#f7f2ea;text-align:center"><p style="margin:0 0 13px;color:#4a3f37;font-size:13px;line-height:1.7">${SELAH_CONTACT_COPY}</p><a href="${SELAH_KAKAO_CHANNEL_URL}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fee500;color:#191600;font-size:13px;font-weight:700;text-decoration:none">셀라 인사이트 카톡 문의하기</a></div><p style="margin:16px 0 0;color:#8a7a6c;font-size:11px;line-height:1.65;text-align:center">${SELAH_NOREPLY_COPY}</p>`;
}

export function kakaoEmailContactText() {
  return `${SELAH_NOREPLY_COPY}\n${SELAH_KAKAO_CHANNEL_URL}`;
}

export function appendKakaoContactToEmail(html: string, text: string) {
  const contactHtml = kakaoEmailContactHtml();
  const nextHtml = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${contactHtml}</body>`)
    : `${html}${contactHtml}`;
  return {
    html: nextHtml,
    text: `${text.trim()}\n\n${kakaoEmailContactText()}`,
  };
}
