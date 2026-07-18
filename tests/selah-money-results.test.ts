import assert from "node:assert/strict";
import { classifySelahMoneyDiagnosis, customerFaithResultTitle, MONEY_TYPE_IDS } from "../src/lib/selah-money-results";
import type { ResultType } from "../src/lib/survey-store";

const singles: ResultType[] = MONEY_TYPE_IDS.map((id) => ({ id, title: id }));

function classify(money: [number, number, number, number], faith: [number, number] = [8, 7]) {
  return classifySelahMoneyDiagnosis(
    {
      organizing_delay: money[0],
      safety_seeking: money[1],
      gaze_sensitive: money[2],
      emotional_reward: money[3],
      faith_burden: faith[0],
      faith_separation: faith[1],
    },
    singles,
  );
}

assert.equal(classify([17, 13, 11, 8]).moneyResult.id, "organizing_delay", "단일형");
assert.equal(
  classify([17, 15, 12, 9]).moneyResult.id,
  "money_combo_organize_safety",
  "이중 조합형",
);
assert.equal(
  classify([17, 16, 15, 10]).moneyResult.id,
  "money_combo_organize_safety_gaze",
  "삼중 조합형",
);
assert.equal(classify([16, 15, 15, 14]).moneyResult.id, "money_combo_all", "네 유형 조합형");
assert.equal(
  classify([16, 16, 11, 8]).moneyResult.id,
  "money_combo_organize_safety",
  "정확한 동점",
);
assert.equal(classify([12, 12, 12, 12]).moneyResult.id, "money_no_clear_pattern", "12점 경계");
assert.equal(classify([13, 10, 9, 8]).moneyResult.id, "organizing_delay", "13점 경계");
assert.equal(
  classify([17, 15, 10, 8]).moneyResult.id,
  "money_combo_organize_safety",
  "최고점과 2점 차이",
);
assert.equal(classify([17, 14, 10, 8]).moneyResult.id, "organizing_delay", "최고점과 3점 차이");

assert.equal(classify([13, 8, 8, 8], [8, 7]).faithResult.id, "faith_low", "신앙 렌즈 낮음");
assert.equal(classify([13, 8, 8, 8], [9, 5]).faithResult.id, "faith_low", "두 렌즈 모두 낮음");
assert.equal(customerFaithResultTitle("faith_low"), "편안한 신앙 연결형", "공통 낮음 고객 결과명");
assert.equal(customerFaithResultTitle("faith_burden_mid"), "신앙부담형", "중간 단계 숨김");
assert.equal(customerFaithResultTitle("faith_burden_high"), "신앙부담형", "높은 단계 숨김");
assert.equal(customerFaithResultTitle("faith_separation_mid"), "신앙분리형", "분리형 단계 숨김");
assert.equal(customerFaithResultTitle("faith_combo_high"), "신앙 조합형", "조합형 단계 숨김");
assert.equal(
  classify([13, 8, 8, 8], [12, 8]).faithResult.id,
  "faith_burden_mid",
  "중간 신앙부담형",
);
assert.equal(
  classify([13, 8, 8, 8], [16, 9]).faithResult.id,
  "faith_burden_high",
  "높은 신앙부담형",
);
assert.equal(
  classify([13, 8, 8, 8], [8, 12]).faithResult.id,
  "faith_separation_mid",
  "중간 신앙분리형",
);
assert.equal(
  classify([13, 8, 8, 8], [9, 16]).faithResult.id,
  "faith_separation_high",
  "높은 신앙분리형",
);
assert.equal(
  classify([13, 8, 8, 8], [11, 10]).faithResult.id,
  "faith_combo_mid",
  "중간 신앙 조합형",
);
assert.equal(
  classify([13, 8, 8, 8], [14, 12]).faithResult.id,
  "faith_combo_high",
  "높은 신앙 조합형",
);

console.log("Selah Money scoring: 16 boundary and result cases passed");
