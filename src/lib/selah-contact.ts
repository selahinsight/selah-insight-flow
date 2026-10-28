export const SELAH_KAKAO_CHANNEL_URL = "https://pf.kakao.com/_pkXFX";

export const SELAH_CONTACT_COPY =
  "문의사항은 ‘셀라인사이트’ 카카오톡 채널로 문의 주세요.";

export const SELAH_NOREPLY_COPY =
  "본 메일은 발신 전용입니다.";

export function kakaoEmailContactHtml() {
  return `<div style="margin-top:30px;padding-top:22px;border-top:1px solid #eee7de;text-align:center"><p style="margin:0 0 12px;color:#62564e;font-size:12px;line-height:1.7">${SELAH_CONTACT_COPY}</p><a href="${SELAH_KAKAO_CHANNEL_URL}" style="display:inline-block;padding:10px 15px;border:1px solid #d8cfc5;border-radius:999px;background:#ffffff;color:#3a302a;font-size:12px;font-weight:600;text-decoration:none"><span style="display:inline-block;width:17px;height:14px;margin-right:7px;border-radius:8px;background:#3a302a;color:#ffffff;font-size:8px;line-height:14px;text-align:center;vertical-align:1px">•••</span>카카오톡 채널 문의</a></div><p style="margin:14px 0 0;color:#9a8e85;font-size:10px;line-height:1.65;text-align:center">${SELAH_NOREPLY_COPY}</p>`;
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
