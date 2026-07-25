export const SELAH_MONEY_RESULT_TEMPLATE_VERSION = "v1" as const;

export interface SelahMoneyResultTemplateContent {
  title: string;
  representativeHeart: string[];
  flow: string[];
  reading: string[];
  checklist: string[];
}

// 고객 화면에는 강도(mid/high) 같은 내부 판정값을 노출하지 않습니다.
// 모든 돈 반응 유형과 신앙 유형은 이 데이터 구조를 사용합니다.
export const SELAH_MONEY_RESULT_TEMPLATE_CONTENT: Record<string, SelahMoneyResultTemplateContent> = {
  safety_seeking: {
    title: "안전추구형",
    representativeHeart: ["아무리 준비해도 부족할까 봐", "마음을 놓기가 어려워."],
    flow: [
      "미래에 돈이 부족할까 걱정함",
      "돈을 아끼고 꼼꼼히 관리함",
      "잠시 마음이 놓임",
      "새로운 지출과 위험이 떠오름",
      "다시 돈을 단단히 붙들게 됨",
    ],
    reading: [
      "안전추구형의 불안은 앞으로 어떤 일이 생길지 알 수 없다는 마음에서 커집니다.",
      "이미 준비하고 있어도 ‘혹시 더 필요하면 어떡하지?’라는 생각이 떠오르고, 돈을 쓰는 순간 나를 지켜줄 안전이 줄어드는 것처럼 느껴집니다.",
      "그래서 꾸준히 모으고 관리하면서도 충분히 안심하기 어렵고, 자신을 위한 지출과 누림 앞에서 자주 망설입니다.",
    ],
    checklist: [
      "비상시에 필요한 금액을 미리 적고 준비해보세요.",
      "앞으로 꼭 하고 싶은 일에 필요한 금액과 날짜를 정해 돈을 준비해보세요.",
      "이번 달에 마음 편히 사용할 금액을 미리 정하고 그 범위 안에서 사용해보세요.",
    ],
  },
  faith_burden_mid: {
    title: "신앙부담형",
    representativeHeart: [
      "나를 위해 돈을 쓰고 누리면",
      "하나님 앞에서 욕심처럼 보일까 봐",
      "마음이 불편해.",
    ],
    flow: [
      "돈을 쓰거나 누릴 일이 생김",
      "신앙적으로 바른 선택인지\n점검함",
      "필요와 목적을 여러 번 확인함",
      "부담과 죄책감이 올라옴",
      "돈을 쓰고 누리는 선택이\n조심스러워짐",
    ],
    reading: [
      "신앙부담형은 돈을 쓸 때 이 선택이 하나님 앞에서 바른지 세심하게 살핍니다.",
      "필요한 지출에서도 ‘내 욕심은 아닐까?’, ‘이렇게 누려도 괜찮을까?’라는 생각이 따라옵니다.",
      "감사하게 사용하고 싶은 마음과 조심해야 한다는 마음이 함께 움직여, 돈을 쓴 뒤에도 자신의 선택을 다시 점검하고 죄책감을 느끼기도 합니다.",
    ],
    checklist: [
      "돈을 사용할 때 목적을 한 문장으로 적어보세요.",
      "이번 달 나를 위해 편안하게 사용할 금액을 미리 정해보세요.",
      "돈을 사용한 뒤 감사한 점 한 가지를 적어보세요.",
    ],
  },
};
