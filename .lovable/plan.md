## 목표
기존 Selah Studio의 베이지/아이보리/클레이 톤, 카드/버튼 스타일, 폰트, 여백을 그대로 유지한 채, 관리자 화면의 정보 구조를 **설문 중심 → 고객관리 중심**으로 확장합니다. 데이터는 계속 localStorage에 저장하되, 추후 Lovable Cloud로 옮기기 쉽게 구조를 다듬습니다.

## 관리자 메뉴 구조 (사이드바)
`AdminShell`의 nav를 아래로 교체합니다. 기존 스타일(active 시 `bg-[var(--sand)]`, `text-[var(--clay)]`)은 그대로 재사용합니다.

1. 대시보드 — `/admin`
2. 설문지 관리 — `/admin/surveys`
3. 응답 관리 — `/admin/responses`
4. 고객 관리 — `/admin/customers`

"새 설문 만들기"는 사이드바에서 빼고 설문지 관리 화면 상단 버튼으로 이동합니다.

## 1. 대시보드 (`/admin`)
현재 `admin.index.tsx`(설문 목록 카드/리스트 뷰)를 `admin.surveys.tsx`로 옮기고, 대시보드 화면을 새로 작성합니다.

지표 카드 (기존 카드 UI 스타일 재사용, `rounded-2xl bg-white/70 shadow-card`):
- 전체 설문 수 / 전체 응답 수 / 전체 고객 수
- 라운지 입장 고객 수 / 유료결제 고객 수

리스트 섹션:
- 최근 응답 10건 (설문명 · 응답자 · 결과 유형 · 제출일시)
- 최근 고객 10건 (이름 · 이메일 · 대표 결과 유형 · 최근 제출일)

## 2. 설문지 관리 (`/admin/surveys`)
기존 `admin.index.tsx`의 카드/리스트 뷰, 삭제 모달, viewMode 저장을 그대로 옮깁니다. 유지되는 기능:
- 목록, 새 설문 만들기 CTA
- 편집, URL 복사, 응답 보기, 미리보기, 닫기, 삭제
- 응답 수 표시, 활성/비활성(status: draft/published/closed) 토글

기존 설문 작성/응답 러너(`s.$slug.tsx`), 편집/공개/분석 화면은 변경하지 않습니다.

## 3. 응답 관리 (`/admin/responses`)
새 화면. 모든 설문의 응답을 한 테이블에 통합해서 봅니다.

상단 필터:
- 설문 선택 드롭다운 (전체 / 개별 설문)

테이블 컬럼:
- 응답자 이름, 이메일, 제출일시
- 자동 결과 유형 (`computeResultType` 재사용)
- 주요 결과 요약 (resultType의 `summary`)
- 라운지 입장 여부 (체크박스, 인라인 토글)
- "고객 상세 보기" 버튼 → 해당 이메일의 고객 상세로 이동

응답에 이름/이메일 필드가 없는 경우가 있으므로, 러너에서 응답 저장 직전에 **이름/이메일 필수 입력 단계**를 추가하고, 응답 저장 시:
- `response.customer = { name, email }`을 함께 저장
- 이메일 기준으로 고객 upsert, `response.customerId` 세팅

## 4. 고객 관리 (`/admin/customers`)
이메일로 자동 통합된 고객 목록.

상단:
- 이름/이메일 검색 인풋
- 필터: 설문별 / 결과 유형별 / 라운지 입장 여부 / 결제 여부

카드/테이블 컬럼:
- 이름, 이메일, 참여 설문 수, 최근 제출일
- 대표 결과 유형 (가장 최근 응답의 결과 유형)
- 라운지 입장 여부, 유료결제 여부
- "고객 상세 보기" 버튼

## 5. 고객 상세 (`/admin/customers/$id`)
- 이름, 이메일
- 참여한 설문 히스토리 목록: 설문 제목, 제출일, 결과 유형, 주요 결과 요약
- 라운지 입장 여부 토글
- 유료결제 여부 토글 + 결제일 입력 (date input)

## 6. 데이터 모델 확장 (`src/lib/survey-store.ts`)

`Response`에 필드 추가:
```ts
customerId?: string;
customerName?: string;
customerEmail?: string;
inLounge?: boolean;
resultTypeId?: string;  // 제출 시 계산해서 저장
```

새 타입 + localStorage 키 `selah.customers.v1`:
```ts
interface Customer {
  id: string;
  name: string;
  email: string;           // 소문자 정규화
  createdAt: number;
  updatedAt: number;
  inLounge: boolean;
  payment_status: "unpaid" | "paid";
  payment_provider?: string;
  payment_id?: string;
  paid_at?: number | null;
}
```

헬퍼:
- `listCustomers()`, `getCustomer(id)`, `getCustomerByEmail(email)`
- `upsertCustomerFromResponse({name, email})` — 이메일 정규화 후 upsert
- `updateCustomer(id, patch)`
- `listResponsesForCustomer(customerId)` — 모든 설문 순회
- `setResponseInLounge(surveyId, responseId, value)`

응답 제출 흐름 (`s.$slug.tsx`):
1. 마지막 단계에 이름/이메일 폼 추가 (기존 UI 톤 유지)
2. `computeResultType` 계산 → `resultTypeId` 저장
3. `upsertCustomerFromResponse` → `customerId` 저장
4. `addResponse`

## 7. 결과 자동 유형 분류
이미 `computeResultType`이 구현되어 있으므로, 제출 시점에 계산해 `response.resultTypeId`로 저장하고 응답/고객 화면에서 조회만 하면 됩니다. 설문별 결과 유형 이름/설명은 기존 `Survey.resultTypes`(id, title, summary, description) 구조를 그대로 사용합니다.

## 8. 라우트 파일 변경
추가:
- `src/routes/admin.index.tsx` — 대시보드 (기존 파일을 대체)
- `src/routes/admin.surveys.tsx` — 설문지 관리 목록 (현재 `admin.index.tsx`의 내용 이관)
- `src/routes/admin.responses.tsx`
- `src/routes/admin.customers.tsx`
- `src/routes/admin.customers.$id.tsx`

수정:
- `src/components/admin/admin-shell.tsx` — 사이드바 nav 항목 교체
- `src/lib/survey-store.ts` — 타입/헬퍼 확장
- `src/lib/use-surveys.ts` — `useCustomers`, `useCustomer` 훅 추가
- `src/routes/s.$slug.tsx` — 응답 제출 전 이름/이메일 단계 추가, 결과 유형 저장, 고객 upsert

기존 `admin.new.tsx`, `admin.surveys.$id.*` 파일은 유지합니다.

## 9. 디자인 유지 규칙
- 컬러 토큰 (`--ivory`, `--cream`, `--sand`, `--clay`, `--rose-soft`)만 사용
- 카드: `rounded-2xl border border-border/60 bg-white/70 shadow-card`
- 주요 CTA: `bg-[var(--clay)] text-white rounded-full`
- 보조 버튼/토글: `border border-border/60 bg-white` + hover `bg-[var(--sand)]/50`
- 삭제/경고 톤은 이미 프로젝트에서 쓰던 muted rose 유지
- 폰트, 여백, 라운드 값 모두 기존 값 그대로

## 이번 단계에서 넣지 않는 것
개인정보 동의 체크박스, 고객 메모, 실제 결제 연동, 이메일 자동 발송, 분석 리포트, 디자인 리뉴얼 — 요청대로 제외.
