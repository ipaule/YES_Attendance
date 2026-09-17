import type { Role } from "@/types";

// Single source of truth for every Korean help string in the app — inline
// HelpTips pull their text from here too, so there is exactly one place to
// edit copy. PLACEHOLDER COPY: structure/wiring is final, wording is not —
// the user asked to rewrite this file's strings themselves.

export interface HelpSection {
  id: string;
  title: string;
  roles: Role[];
  paragraphs: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = ["PASTOR", "EXECUTIVE", "LEADER"];
const LEADERSHIP: Role[] = ["PASTOR", "EXECUTIVE"];

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "role",
    title: "내 역할로 할 수 있는 일",
    roles: ALL_ROLES,
    paragraphs: [
      "순장: 배정된 순의 출석표를 기록하고, 출석 그래프를 볼 수 있습니다. 순원 추가/삭제나 날짜 추가는 할 수 없습니다.",
      "공동체장: 자신의 공동체(믿음/소망/사랑/샬롬) 전체 현황, 순 관리(순 추가·이름 변경·삭제), 공동체 그래프에 접근합니다. 샬롬 담당 공동체장은 샬롬 리스트와 로스터 이동 화면도 봅니다.",
      "사역자: 모든 공동체, 재적 리스트, 미등록자 관리, 한 주의 준비, 리더쉽(역할) 관리 등 전체 관리 기능에 접근합니다. 순원 추가/삭제 권한도 사역자에게만 있습니다.",
    ],
  },
  {
    id: "attendance-mobile",
    title: "출석 기록하는 법 — 모바일 (순장)",
    roles: ["LEADER"],
    paragraphs: [
      "상단에서 날짜를 선택한 뒤, 각 순원 이름 옆 출석/결석/사유결석 버튼을 눌러 기록합니다. 같은 버튼을 다시 누르면 기록이 지워집니다.",
      "결석·사유결석에는 연필 아이콘으로 사유를 입력할 수 있습니다 (선택 사항).",
      "'전체 출석 체크'는 아직 기록되지 않은 순원만 출석으로 채웁니다 — 이미 결석/사유결석으로 기록된 사람은 바뀌지 않습니다. 방금 누른 것은 '되돌리기'로 취소할 수 있습니다.",
      "날짜가 잠겨 있으면(자물쇠 표시) 수정할 수 없습니다.",
    ],
  },
  {
    id: "attendance-desktop",
    title: "출석 기록하는 법 — PC",
    roles: ALL_ROLES,
    paragraphs: [
      "표의 칸을 클릭하면 팝업이 열리고, 출석/결석/사유결석/지우기 중 하나를 선택합니다. 결석이나 사유결석을 고르면 같은 팝업 안에서 바로 사유를 입력할 수 있습니다.",
      "날짜 열 머리글의 이동 아이콘(✓)으로 그 날짜의 빈칸만 한 번에 출석 처리할 수 있습니다.",
      "표 상단의 ‹ 오늘 › 로 날짜 열 사이를 이동할 수 있고, 옆에 오늘 기준 출석 기록 현황(N명 중 M명)이 표시됩니다.",
    ],
  },
  {
    id: "required",
    title: "무엇을 채워야 하나 — 필수 vs 선택",
    roles: ALL_ROLES,
    paragraphs: [
      "출석 상태(출석/결석/사유결석)는 매 날짜·매 순원마다 필수입니다. 빈칸으로 두면 '기록 없음'으로 취급되어 출석률 계산에서 제외됩니다 — 결석과는 다릅니다.",
      "사유(결석/사유결석 사유)는 선택 사항입니다. 다만 사유결석인데 사유가 없으면 셀에 호박색 점으로 표시되니, 가능하면 채워주세요.",
      "출석 기록이 하나도 없는 순원은 등급이 F가 아니라 '-'로 표시됩니다.",
    ],
  },
  {
    id: "screens",
    title: "화면별 안내",
    roles: LEADERSHIP,
    paragraphs: [
      "순 만들기: 순장 계정을 먼저 만든 뒤, 공동체 현황 화면에서 '순 추가'로 순장을 선택하면 순 이름은 그 순장의 계정명으로 자동 지정됩니다. 이름을 직접 정할 수는 없습니다 (나중에 연필 아이콘으로 수정 가능).",
      "순원 추가는 검색 후 목록에서 반드시 클릭해서 선택해야 합니다 — 이름을 타이핑만 하고 추가를 누르면 안내 문구가 뜨고 추가되지 않습니다. 자동완성에는 미배정이거나 같은 순 소속인 사람만 나타납니다. 재적에 없는 사람은 재적을 먼저 등록해야 합니다.",
    ],
  },
  {
    id: "shalom",
    title: "샬롬 화면 안내",
    roles: LEADERSHIP,
    paragraphs: [
      "샬롬 리스트: 아직 순에 배정되지 않은 새신자·방문자를 관리하는 화면입니다. 상태는 방문 → 등록 → 졸업 순으로 진행되며, 목록에서 직접 상태를 바꿀 수 있습니다.",
      "상태는 자동으로도 바뀝니다 — 샬롬 소속 순에 순원으로 추가하면 그 사람은 자동으로 '등록' 상태가 되고, 순에서 삭제하면 다시 '방문'으로 돌아갑니다. 목록에서 상태가 저절로 바뀌었다면 이 때문입니다.",
      "로스터로 이동: 상태가 '졸업'인 사람만 '로스터로 이동' 버튼이 활성화됩니다. 이동하면 재적(로스터)에 새로 등록되고 미등록자 리스트로 들어가며, 이후 공동체·순을 배정하면 출석표에 연결됩니다. 이미 이동한 사람이거나 재적에 같은 이름이 이미 있으면 다시 이동할 수 없습니다.",
      "폴더에 저장(샬롬 기록으로 보내기): 선택한 사람을 이름·연락처 등 일부 핵심 필드만 남긴 채 '샬롬 기록' 폴더로 옮기고, 샬롬 리스트에서는 완전히 삭제합니다. 나머지 상세 정보는 보존되지 않으므로, 계속 관리할 사람은 저장하지 말고 리스트에 남겨두세요. 되돌릴 수 없어 저장 전 확인 문구를 입력해야 합니다.",
      "샬롬 기록: 폴더에 저장된 과거 방문자 기록을 모아두는 화면입니다. 폴더 이름 변경, 하위 폴더 생성, 폴더 안에서 사람을 다른 폴더로 옮기는 것이 가능합니다. 리스트(현재 진행 중인 신규 방문자)와는 다른 화면이니 구분해서 사용하세요.",
      "샬롬 그래프: 방문·등록·졸업 인원수는 누적으로 집계됩니다 (등록 인원에는 이미 졸업한 사람도 포함). 졸업생 등급 그래프는 순 출석 기록의 이름과 매칭되는 졸업생만 집계하며, 매칭되지 않으면 제외됩니다.",
    ],
  },
];

// Kept to real "why does it do that" gotchas that aren't already obvious from
// the UI or the sections above — not restatements of on-screen labels, and
// not narration of bugs that have since been fixed.
export const FAQ: FaqItem[] = [
  // A. 출석 기록
  { id: "a6", roles: ALL_ROLES, question: "사유는 꼭 써야 하나요?", answer: "아니요, 선택 사항입니다. 다만 사유결석인데 사유가 없으면 칸에 호박색 점으로 표시되니 확인해서 채워주세요." },
  { id: "a11", roles: ALL_ROLES, question: "'전체 출석 체크'가 왜 어떤 사람은 안 바꾸나요?", answer: "이미 결석/사유결석/출석으로 기록된 사람은 건드리지 않고, 빈칸인 사람만 출석으로 채우기 때문입니다." },
  { id: "a12", roles: ALL_ROLES, question: "눌러도 아무 반응이 없어요.", answer: "그 날짜가 잠겨 있을 수 있습니다. 잠긴 날짜는 팝업이 읽기 전용으로 열리며 수정할 수 없습니다." },
  { id: "a13", roles: LEADERSHIP, question: "날짜를 잠그면 무슨 일이 생기나요?", answer: "그 날짜의 출석 기록을 더 이상 수정할 수 없게 됩니다. 지난 기록을 보호할 때 사용하세요." },
  { id: "a14", roles: ALL_ROLES, question: "빈칸으로 두는 것과 결석 처리는 다른가요?", answer: "빈칸(미기록)과 결석은 다릅니다. 빈칸은 출석률 계산에서 아예 제외되지만, 결석은 분모에 포함되어 출석률을 낮춥니다." },
  // B. 출석률 · 등급
  { id: "b2", roles: ALL_ROLES, question: "출석률은 어떻게 계산되나요?", answer: "출석한 날짜 수를 (전체 날짜 - 사유결석 - 빈칸)으로 나눈 값입니다. 사유결석은 분모에서 빠지므로 출석률에 영향을 주지 않습니다." },
  { id: "b4", roles: ALL_ROLES, question: "등급(A/B/C/D/F) 기준이 뭔가요?", answer: "80% 이상 A, 60% 이상 B, 40% 이상 C, 20% 이상 D, 그 미만 F 입니다." },
  // C. 순 · 순원 관리
  { id: "c1", roles: LEADERSHIP, question: "순은 어떻게 만드나요?", answer: "공동체 현황 화면에서 '순 추가'를 누르고 순장 계정을 선택하면 됩니다. 순 이름은 그 순장의 계정명으로 자동 지정되며, 이후 연필 아이콘으로 바꿀 수 있습니다." },
  { id: "c3", roles: LEADERSHIP, question: "새 순을 만들었는데 날짜가 이미 있어요 / 없어요.", answer: "믿음·소망·사랑 공동체의 순은 만들 때 기존 공용 날짜를 자동으로 복사합니다. 샬롬 등 다른 공동체는 복사되지 않습니다." },
  { id: "c4", roles: LEADERSHIP, question: "이름을 쳤는데 왜 추가가 안 되나요?", answer: "순원 추가는 검색 결과 목록에서 클릭해 선택해야 합니다. 재적에 먼저 등록된 사람만 검색되고, 그중에서도 미배정이거나 이미 이 순 소속인 사람만 나타납니다. 다른 순 소속이면 재적에서 먼저 배정을 해제해야 합니다." },
  { id: "c7", roles: LEADERSHIP, question: "순을 지우면 출석 기록도 사라지나요?", answer: "네, 그 순의 순원과 날짜, 출석 기록이 함께 삭제됩니다. 삭제 전 영향 범위를 보여주는 확인창이 뜹니다." },
  { id: "c9", roles: LEADERSHIP, question: "순원을 다른 순으로 어떻게 옮기나요?", answer: "재적에서 순장(순) 필드를 변경하면 출석표에도 자동 반영됩니다. 대상 순이 존재하지 않으면 안내 메시지가 뜹니다." },
  { id: "c10", roles: LEADERSHIP, question: "재적에서 삭제하면 어떻게 되나요?", answer: "이름이 같은 모든 순의 출석 기록이 함께 삭제됩니다. 되돌릴 수 없으니 삭제 전 이름을 타이핑해 한 번 더 확인합니다." },
  // D. 샬롬 → 재적 이동
  { id: "d1", roles: LEADERSHIP, question: "방문 / 등록 / 졸업은 무슨 차이인가요?", answer: "방문: 교회에 처음 방문한 인원. 등록: 샬롬반을 등록한 인원. 졸업: 샬롬 과정을 마친 인원입니다." },
  { id: "d2", roles: LEADERSHIP, question: "로스터로 이동이 안 돼요.", answer: "상태가 '졸업'이어야 이동 버튼이 활성화됩니다. 이동하면 미등록자 리스트로 들어가며, 이미 이동했거나 재적에 동명이인이 있으면 다시 이동할 수 없습니다." },
  { id: "d5", roles: LEADERSHIP, question: "상태가 저절로 '등록'으로 바뀌었어요.", answer: "샬롬 순에 순원으로 추가되면 자동으로 '등록' 상태로 전환됩니다." },
  { id: "d6", roles: LEADERSHIP, question: "'폴더에 저장'하면 원본은 어떻게 되나요?", answer: "일부 필드만 폴더에 보존되고 원본 항목은 리스트에서 삭제됩니다. 되돌릴 수 없어 삭제 전 확인 문구를 입력해야 합니다." },
  { id: "d7", roles: LEADERSHIP, question: "샬롬 리스트와 샬롬 기록은 뭐가 다른가요?", answer: "리스트는 현재 관리 중인 신규 방문자, 기록은 폴더에 저장(보관)된 과거 방문자입니다. 계속 관리해야 하는 사람은 폴더에 저장하지 말고 리스트에 두세요." },
  { id: "d8", roles: LEADERSHIP, question: "샬롬 그래프의 방문/등록/졸업 숫자는 어떻게 계산되나요?", answer: "누적 집계입니다. 등록 인원에는 이미 졸업한 사람도 포함되고, 방문 인원에는 등록·졸업한 사람도 포함됩니다." },
  // E. 권한 · 계정
  { id: "e2", roles: ALL_ROLES, question: "사이드바에 왜 이 메뉴가 안 보이나요?", answer: "메뉴는 역할(순장/공동체장/사역자)에 따라 자동으로 달라집니다. 필요한 메뉴가 없다면 사역자에게 역할 변경을 요청하세요." },
  { id: "e3", roles: ALL_ROLES, question: "가입했는데 순이 안 보여요.", answer: "가입 직후에는 모두 순장으로 시작하며, 순 배정은 사역자가 해줘야 합니다." },
  { id: "e4", roles: ALL_ROLES, question: "역할은 누가 바꾸나요?", answer: "사역자만 리더쉽 관리 화면에서 바꿀 수 있으며, 변경 전 확인창이 뜹니다." },
  // F. 그래프 · 기록
  { id: "f2", roles: LEADERSHIP, question: "공동체 그래프에서 우리 순이 왜 0인가요?", answer: "그래프는 날짜가 아니라 날짜 라벨(이름)로 데이터를 합칩니다. 라벨이 다른 순과 다르면 기록이 있어도 0으로 보일 수 있습니다." },
  { id: "f3", roles: LEADERSHIP, question: "합산 그래프 %의 분모는 무엇인가요?", answer: "공동체별 재적 인원 수입니다. 재적에 공동체가 입력되지 않은 사람이 많으면 값이 왜곡될 수 있습니다." },
  { id: "f4", roles: LEADERSHIP, question: "졸업생 등급에 왜 일부만 나오나요?", answer: "순 출석 기록과 이름이 매칭된 졸업생만 집계됩니다. 'N명 중 M명 매칭됨'으로 매칭 비율을 보여줍니다." },
  { id: "f5", roles: LEADERSHIP, question: "'새로운 텀 시작'은 뭘 지우나요?", answer: "믿음·소망·사랑의 순·순원·출석·날짜를 기록으로 저장한 뒤 삭제하고, 순장 계정도 삭제합니다. 3단계 확인을 거칩니다." },
  // G. 저장
  { id: "g1", roles: ALL_ROLES, question: "저장 버튼이 없는데 자동 저장인가요?", answer: "네, 값을 바꾸는 즉시 서버에 저장됩니다. 저장에 실패하면 화면 하단에 실패 알림이 뜨고, 알림이 없으면 저장된 것입니다." },
];

// Lets inline HelpTips (attendance legend, rate/grade headers, lock toggle,
// reason input) quote the same FAQ answer shown on /dashboard/help, instead
// of duplicating the sentence at each call site.
export function helpAnswer(id: string): string {
  return FAQ.find((f) => f.id === id)?.answer ?? "";
}
