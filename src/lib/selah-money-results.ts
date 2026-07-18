import resultLibrary from "@/data/selah-money-result-library.json";
import type { ResultType } from "@/lib/survey-store";

export const MONEY_TYPE_IDS = [
  "organizing_delay",
  "safety_seeking",
  "gaze_sensitive",
  "emotional_reward",
] as const;

export const FAITH_LENS_IDS = ["faith_burden", "faith_separation"] as const;

export type MoneyTypeId = (typeof MONEY_TYPE_IDS)[number];
export type FaithLensId = (typeof FAITH_LENS_IDS)[number];
export type ScoreSummary = Record<
  string,
  { total: number; average: number; intensity: "low" | "mid" | "high" }
>;

export interface SelahMoneyDiagnosisResult {
  moneyResult: ResultType;
  faithResult: ResultType;
  includedMoneyTypeIds: MoneyTypeId[];
  scores: ScoreSummary;
  hasMoneyTie: boolean;
}

const moneyCombinations = resultLibrary.moneyCombinationResults as ResultType[];
const faithResults = resultLibrary.faithResults as ResultType[];
const noClearMoneyResult = resultLibrary.noClearMoneyResult as ResultType;

const baseResultOverrides: Record<string, Partial<ResultType>> = {
  organizing_delay: {
    interpretation: "정리미룸형은 돈을 마주할 때 부담을 크게 느끼는 편입니다.\n\n통장 잔액, 카드값, 구독, 할부 내역을 확인해야 한다는 걸 알지만, 막상 보려고 하면 머리가 복잡해지고 마음이 무거워질 수 있어요.",
    flow: "돈을 확인하는 게 부담스러움\n→ 확인과 정리를 미룸\n→ 잠시 마음이 편해짐\n→ 돈의 흐름이 흐릿해짐\n→ 불안과 부담이 더 커짐",
  },
};

export function customerFaithResultTitle(resultId: string, fallback = "신앙 유형"): string {
  if (resultId === "faith_low") return "신앙 렌즈 낮음";
  if (resultId.startsWith("faith_burden_")) return "신앙부담형";
  if (resultId.startsWith("faith_separation_")) return "신앙분리형";
  if (resultId.startsWith("faith_combo_")) return "신앙 조합형";
  return fallback;
}

const combinationIdByMembers: Record<string, string> = Object.fromEntries(
  moneyCombinations.map((result) => [(result.componentIds ?? []).join("|"), result.id]),
);

function intensity(total: number): "low" | "mid" | "high" {
  if (total <= 9) return "low";
  if (total <= 12) return "mid";
  return "high";
}

export function allSelahMoneyResults(baseResults: ResultType[] = []): ResultType[] {
  const byId = new Map<string, ResultType>();
  for (const result of [
    ...baseResults,
    noClearMoneyResult,
    ...moneyCombinations,
    ...faithResults,
  ]) {
    byId.set(result.id, { ...result, ...baseResultOverrides[result.id] });
  }
  return [...byId.values()];
}

export function classifySelahMoneyDiagnosis(
  totals: Record<MoneyTypeId | FaithLensId, number>,
  baseResults: ResultType[] = [],
): SelahMoneyDiagnosisResult {
  const allResults = allSelahMoneyResults(baseResults);
  const byId = (id: string): ResultType => {
    const result = allResults.find((item) => item.id === id);
    if (!result) throw new Error(`셀라 머니 결과 원고를 찾을 수 없습니다: ${id}`);
    return result;
  };

  const scores = Object.fromEntries(
    Object.entries(totals).map(([id, total]) => [
      id,
      { total, average: total / 5, intensity: intensity(total) },
    ]),
  ) as ScoreSummary;

  const highestMoneyTotal = Math.max(...MONEY_TYPE_IDS.map((id) => totals[id]));
  const includedMoneyTypeIds =
    highestMoneyTotal < 13
      ? []
      : MONEY_TYPE_IDS.filter((id) => totals[id] >= 13 && highestMoneyTotal - totals[id] <= 2);

  let moneyResult: ResultType;
  if (includedMoneyTypeIds.length === 0) {
    moneyResult = noClearMoneyResult;
  } else if (includedMoneyTypeIds.length === 1) {
    moneyResult = byId(includedMoneyTypeIds[0]);
  } else {
    const combinationId = combinationIdByMembers[includedMoneyTypeIds.join("|")];
    if (!combinationId)
      throw new Error(`돈 반응 조합 원고를 찾을 수 없습니다: ${includedMoneyTypeIds.join(",")}`);
    moneyResult = byId(combinationId);
  }

  const burden = totals.faith_burden;
  const separation = totals.faith_separation;
  let faithResultId: string;
  if (burden <= 9 && separation <= 9) {
    faithResultId = "faith_low";
  } else if (burden >= 10 && separation >= 10 && Math.abs(burden - separation) <= 2) {
    faithResultId = burden + separation <= 25 ? "faith_combo_mid" : "faith_combo_high";
  } else {
    const winningLens = burden >= separation ? "burden" : "separation";
    const winningTotal = Math.max(burden, separation);
    faithResultId = `faith_${winningLens}_${winningTotal <= 12 ? "mid" : "high"}`;
  }

  const highestIncludedTotal = includedMoneyTypeIds.length
    ? Math.max(...includedMoneyTypeIds.map((id) => totals[id]))
    : 0;
  const hasMoneyTie =
    includedMoneyTypeIds.filter((id) => totals[id] === highestIncludedTotal).length > 1;

  return {
    moneyResult,
    faithResult: byId(faithResultId),
    includedMoneyTypeIds,
    scores,
    hasMoneyTie,
  };
}
