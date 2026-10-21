export const MONEY_PRODUCTS = {
  report: {
    code: "report",
    studioCode: "paid_diagnosis_report",
    name: "셀라 머니 심층 리포트",
    amount: 9_900,
    currency: "KRW",
  },
  workbook: {
    code: "workbook",
    studioCode: "workbook_package",
    name: "셀라 머니 워크북",
    amount: 29_000,
    currency: "KRW",
  },
  set: {
    code: "set",
    studioCode: "report_workbook_bundle",
    name: "셀라 머니 심층 리포트 + 워크북 세트",
    amount: 34_900,
    currency: "KRW",
  },
} as const;

export type MoneyProductCode = keyof typeof MONEY_PRODUCTS;

