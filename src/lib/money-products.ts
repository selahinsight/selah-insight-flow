export const MONEY_PRODUCTS = {
  report: {
    code: "report",
    name: "셀라 머니 심층 리포트",
    amount: 9_900,
    currency: "KRW",
  },
  workbook: {
    code: "workbook",
    name: "셀라 머니 워크북",
    amount: 29_000,
    currency: "KRW",
  },
  set: {
    code: "set",
    name: "셀라 머니 심층 리포트 + 워크북 세트",
    amount: 34_900,
    currency: "KRW",
  },
} as const;

export type MoneyProductCode = keyof typeof MONEY_PRODUCTS;

