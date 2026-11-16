import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const library = JSON.parse(readFileSync("src/data/selah-money-result-library.json", "utf8"));
const canonicalPaths = [
  "src/lib/selah-money-result-template.ts",
  ...process.argv.slice(2),
];
const resultTypes = Object.values(library).flatMap((value) => Array.isArray(value) ? value : []);

function canonicalTitles(path) {
  const source = readFileSync(path, "utf8");
  return new Map(
    [...source.matchAll(/^  ([a-z0-9_]+): \{\r?\n    title: "([^"]+)",/gm)]
      .map((match) => [match[1], match[2]]),
  );
}

const failures = [];
for (const entry of resultTypes) {
  if (entry.title !== entry.name) {
    failures.push(`${entry.id}: library title/name 불일치 (${entry.title} / ${entry.name})`);
  }
}

for (const rawPath of canonicalPaths) {
  const path = resolve(rawPath);
  const titles = canonicalTitles(path);
  if (!titles.size) failures.push(`${path}: 기준 유형명을 읽지 못함`);
  for (const entry of resultTypes) {
    const expected = titles.get(entry.id);
    if (expected && (entry.title !== expected || entry.name !== expected)) {
      failures.push(`${entry.id}: ${entry.title} / 기준 ${expected} (${path})`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`유형명 일치 확인 완료: ${resultTypes.length}개 라이브러리 항목, ${canonicalPaths.length}개 기준 원본`);
