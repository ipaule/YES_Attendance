// Shalom-only reset + import: clears ShalomMember (current list) and
// ShalomHistory (archive), then loads a fresh dataset from a new roster
// paste. Scoped to these two tables only — no other data is touched.
//
// History rows (2026-01-04 .. 2026-05-03) are split into three folders by
// status: "2026년 1월-6월 방문", "2026년 1월-6월 등록", "2026년 1월-6월 졸업".
// List rows (2026-05-10 .. 2026-07-19) become live ShalomMember rows.
//
// Uses the app-level `prisma` from src/lib/db.ts so phone/note (ShalomMember)
// and the whole `data` blob (ShalomHistory) are auto-encrypted on write.
//
// Run locally:  npx tsx --env-file=.env.local prisma/reset-and-import-shalom.ts
// Run on Turso: npx tsx prisma/reset-and-import-shalom.ts
import { prisma } from "../src/lib/db";

interface HistoryPerson {
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  phone: string;
  visitDate: string;
  inviter: string;
  leader: string;
  note: string;
  status: string;
}

// Two duplicates in the source sheet (신민하, 이유영) each had an earlier row
// (1/4 방문, 1/18 등록) and a later row (3/8 졸업) — per user instruction, the
// earlier row is dropped and only the later one is kept below.

const HISTORY_VISIT: HistoryPerson[] = [
  { name: "정서연", englishName: "", gender: "여", birthYear: "1993", phone: "424-230-4663", visitDate: "2026-02-01", inviter: "", leader: "", note: "연락안됨", status: "방문" },
  { name: "지혜령", englishName: "", gender: "여", birthYear: "1995", phone: "323-428-5845", visitDate: "2026-02-22", inviter: "", leader: "이웅희", note: "연락안됨", status: "방문" },
  { name: "장경욱", englishName: "Paul Jang", gender: "남", birthYear: "1984", phone: "310-489-6316", visitDate: "2026-03-01", inviter: "", leader: "", note: "장년부이동", status: "방문" },
  { name: "권도현", englishName: "", gender: "남", birthYear: "2000", phone: "805-588-8737", visitDate: "2026-03-01", inviter: "", leader: "", note: "거리상 교회참석 어려움", status: "방문" },
  { name: "오예준", englishName: "", gender: "남", birthYear: "2000", phone: "224-522-9328", visitDate: "2026-03-01", inviter: "", leader: "", note: "거리상 교회참석 어려움", status: "방문" },
  { name: "이은수", englishName: "", gender: "남", birthYear: "2001", phone: "+82 010 4256 9364", visitDate: "2026-03-08", inviter: "", leader: "", note: "한국에서 미국잠시 방문, 다시 한국귀국", status: "방문" },
  { name: "나예은", englishName: "", gender: "여", birthYear: "2000", phone: "010-7401-8485", visitDate: "2026-03-15", inviter: "", leader: "", note: "2026년 9월에 다시 미국오실예정", status: "방문" },
  { name: "성윤석", englishName: "", gender: "남", birthYear: "2001", phone: "410-340-0070", visitDate: "2026-03-22", inviter: "", leader: "", note: "연락안됨", status: "방문" },
  { name: "임민규", englishName: "", gender: "남", birthYear: "1998", phone: "949-220-4798", visitDate: "2026-03-29", inviter: "", leader: "", note: "", status: "방문" },
  { name: "문석준", englishName: "", gender: "남", birthYear: "1998", phone: "323-219-1366", visitDate: "2026-03-29", inviter: "", leader: "", note: "*주의필요- 목사님과 상담- 공동체순은 어려울거같다고 판정", status: "방문" },
  { name: "Tony Chung", englishName: "", gender: "남", birthYear: "1982", phone: "714-334-3156", visitDate: "2026-04-05", inviter: "", leader: "", note: "장년부이동 -나이 issue", status: "방문" },
  { name: "유인주", englishName: "", gender: "여", birthYear: "1993", phone: "907-782-8282", visitDate: "2026-04-05", inviter: "", leader: "", note: "2026년 7월 다시방문예정", status: "방문" },
  { name: "신형탁", englishName: "", gender: "남", birthYear: "1991", phone: "213-210-1716", visitDate: "2026-05-03", inviter: "", leader: "", note: "*주의필요", status: "방문" },
];

const HISTORY_REGISTER: HistoryPerson[] = [
  { name: "리아", englishName: "Pak", gender: "여", birthYear: "1986", phone: "773-386-7773", visitDate: "2026-01-11", inviter: "", leader: "조창현", note: "중간에 연락안됨", status: "등록" },
  { name: "강민구", englishName: "", gender: "남", birthYear: "1991", phone: "240-885-9576", visitDate: "2026-01-11", inviter: "", leader: "조창현", note: "", status: "등록" },
  { name: "심규석", englishName: "", gender: "남", birthYear: "1987", phone: "847-323-4268", visitDate: "2026-01-18", inviter: "", leader: "조창현", note: "", status: "등록" },
  { name: "이소현", englishName: "stella", gender: "여", birthYear: "2002", phone: "949-278-5004", visitDate: "2026-01-18", inviter: "", leader: "강예지", note: "", status: "등록" },
  { name: "조환희", englishName: "", gender: "남", birthYear: "1992", phone: "213-800-2601", visitDate: "2026-01-18", inviter: "", leader: "조창현", note: "영어권예배로 이동", status: "등록" },
  { name: "박주은", englishName: "", gender: "여", birthYear: "2001", phone: "740-405-1124", visitDate: "2026-01-18", inviter: "", leader: "강예지", note: "", status: "등록" },
  { name: "양준영", englishName: "", gender: "남", birthYear: "1992", phone: "818-661-0309", visitDate: "2026-01-18", inviter: "", leader: "조창현", note: "", status: "등록" },
  { name: "조수빈", englishName: "", gender: "여", birthYear: "1998", phone: "917-963-6212", visitDate: "2026-01-18", inviter: "", leader: "강예지", note: "", status: "등록" },
  { name: "Henrik", englishName: "", gender: "남", birthYear: "1985", phone: "310-733-8144", visitDate: "2026-02-15", inviter: "", leader: "이성진", note: "", status: "등록" },
  { name: "Justin Kim", englishName: "", gender: "남", birthYear: "1986", phone: "503-984-9084", visitDate: "2026-02-15", inviter: "", leader: "이성진", note: "", status: "등록" },
  { name: "최유란", englishName: "", gender: "여", birthYear: "1997", phone: "949-278-8203", visitDate: "2026-03-01", inviter: "", leader: "이성진", note: "3/15일 이후 교회 안나오심", status: "등록" },
  { name: "박민정", englishName: "", gender: "여", birthYear: "2001", phone: "657-252-2556", visitDate: "2026-03-08", inviter: "", leader: "최현지", note: "", status: "등록" },
  { name: "신선하", englishName: "", gender: "여", birthYear: "1999", phone: "213-280-0540", visitDate: "2026-03-08", inviter: "", leader: "최현지", note: "", status: "등록" },
  { name: "김예린", englishName: "", gender: "여", birthYear: "1995", phone: "714-349-3269", visitDate: "2026-04-12", inviter: "", leader: "강예지", note: "", status: "등록" },
  { name: "소병준", englishName: "", gender: "남", birthYear: "1998", phone: "714-801-0028", visitDate: "2026-04-19", inviter: "", leader: "원하은", note: "", status: "등록" },
];

const HISTORY_GRADUATE: HistoryPerson[] = [
  { name: "오민영", englishName: "", gender: "여", birthYear: "1998", phone: "562-240-7438", visitDate: "2026-01-04", inviter: "", leader: "최예림", note: "", status: "졸업" },
  { name: "이채영", englishName: "", gender: "여", birthYear: "1997", phone: "949-942-0390", visitDate: "2026-01-04", inviter: "", leader: "최예림", note: "", status: "졸업" },
  { name: "조근형", englishName: "", gender: "남", birthYear: "1998", phone: "814-826-8639", visitDate: "2026-01-04", inviter: "", leader: "최예림", note: "", status: "졸업" },
  { name: "김금서", englishName: "", gender: "여", birthYear: "2002", phone: "714-686-3620", visitDate: "2026-01-04", inviter: "", leader: "최예림", note: "", status: "졸업" },
  { name: "정호진", englishName: "", gender: "남", birthYear: "1998", phone: "386-506-6934", visitDate: "2026-01-11", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "최승규", englishName: "", gender: "남", birthYear: "1998", phone: "310-365-6822", visitDate: "2026-01-11", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "고태의", englishName: "", gender: "여", birthYear: "1992", phone: "714-975-1212", visitDate: "2026-01-11", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "이서영", englishName: "", gender: "여", birthYear: "1993", phone: "317-703-4819", visitDate: "2026-02-08", inviter: "", leader: "김슬기", note: "", status: "졸업" },
  { name: "이해원", englishName: "", gender: "여", birthYear: "1999", phone: "510-710-2032", visitDate: "2026-02-08", inviter: "", leader: "김슬기", note: "", status: "졸업" },
  { name: "윤나영", englishName: "", gender: "여", birthYear: "1985", phone: "213-948-3232", visitDate: "2026-02-08", inviter: "", leader: "김슬기", note: "", status: "졸업" },
  { name: "이채정", englishName: "", gender: "여", birthYear: "2003", phone: "657-835-8744", visitDate: "2026-02-15", inviter: "", leader: "이웅희", note: "", status: "졸업" },
  { name: "김반석", englishName: "", gender: "남", birthYear: "1995", phone: "213-273-4691", visitDate: "2026-02-15", inviter: "", leader: "이웅희", note: "", status: "졸업" },
  { name: "이현정", englishName: "", gender: "여", birthYear: "1995", phone: "562-347-5220", visitDate: "2026-03-01", inviter: "", leader: "이성진", note: "", status: "졸업" },
  { name: "남혜준", englishName: "", gender: "여", birthYear: "1996", phone: "332-323-7393", visitDate: "2026-03-01", inviter: "", leader: "이성진", note: "", status: "졸업" },
  { name: "김몰건", englishName: "", gender: "남", birthYear: "1999", phone: "714-213-9900", visitDate: "2026-03-01", inviter: "", leader: "이성진", note: "", status: "졸업" },
  { name: "임승주", englishName: "", gender: "남", birthYear: "2002", phone: "201-518-6596", visitDate: "2026-03-01", inviter: "", leader: "이성진", note: "", status: "졸업" },
  { name: "이가현", englishName: "", gender: "여", birthYear: "2001", phone: "562-458-4209", visitDate: "2026-03-01", inviter: "", leader: "최현지", note: "", status: "졸업" },
  { name: "신민하", englishName: "", gender: "여", birthYear: "1997", phone: "201-788-6423", visitDate: "2026-03-08", inviter: "", leader: "최현지", note: "", status: "졸업" },
  { name: "남태희", englishName: "", gender: "남", birthYear: "1997", phone: "857-452-9199", visitDate: "2026-03-08", inviter: "", leader: "최현지", note: "", status: "졸업" },
  { name: "이유영", englishName: "", gender: "여", birthYear: "2001", phone: "424-461-4071", visitDate: "2026-03-08", inviter: "", leader: "최현지", note: "강예지 순장님 순이었다가 한국갔다오면서 최현지 순장님네로 이월", status: "졸업" },
  { name: "Jason Choi", englishName: "", gender: "남", birthYear: "1989", phone: "714-222-9795", visitDate: "2026-03-08", inviter: "", leader: "원하은", note: "", status: "졸업" },
  { name: "정승엽", englishName: "", gender: "남", birthYear: "1995", phone: "909-510-2163", visitDate: "2026-03-08", inviter: "", leader: "원하은", note: "", status: "졸업" },
  { name: "김경민", englishName: "", gender: "남", birthYear: "1994", phone: "978-844-3253", visitDate: "2026-03-08", inviter: "", leader: "원하은", note: "", status: "졸업" },
  { name: "박현진", englishName: "", gender: "여", birthYear: "1991", phone: "415-507-3518", visitDate: "2026-03-08", inviter: "", leader: "원하은", note: "", status: "졸업" },
  { name: "김인수", englishName: "", gender: "남", birthYear: "2001", phone: "747-290-4472", visitDate: "2026-03-15", inviter: "", leader: "이수아", note: "", status: "졸업" },
  { name: "이수빈", englishName: "", gender: "여", birthYear: "2000", phone: "213-571-7578", visitDate: "2026-03-15", inviter: "", leader: "이수아", note: "", status: "졸업" },
  { name: "이하진", englishName: "", gender: "여", birthYear: "1991", phone: "한국", visitDate: "2026-03-15", inviter: "", leader: "이수아", note: "", status: "졸업" },
  { name: "김해니", englishName: "", gender: "여", birthYear: "1999", phone: "714-707-0576", visitDate: "2026-03-15", inviter: "", leader: "이수아", note: "", status: "졸업" },
  { name: "김해나", englishName: "", gender: "여", birthYear: "2002", phone: "714-858-5031", visitDate: "2026-03-29", inviter: "", leader: "조창현", note: "", status: "졸업" },
  { name: "채지수", englishName: "", gender: "여", birthYear: "2002", phone: "626-689-5904", visitDate: "2026-03-29", inviter: "", leader: "조창현", note: "", status: "졸업" },
  { name: "장석호", englishName: "", gender: "남", birthYear: "1995", phone: "626-532-2004", visitDate: "2026-03-29", inviter: "", leader: "조창현", note: "", status: "졸업" },
  { name: "김현지", englishName: "", gender: "여", birthYear: "2002", phone: "310-901-7457", visitDate: "2026-03-29", inviter: "", leader: "조창현", note: "", status: "졸업" },
  { name: "김수빈", englishName: "", gender: "여", birthYear: "1997", phone: "310-661-1196", visitDate: "2026-04-05", inviter: "", leader: "조창현", note: "", status: "졸업" },
  { name: "박정윤", englishName: "", gender: "여", birthYear: "2002", phone: "657-253-6308", visitDate: "2026-04-05", inviter: "", leader: "조창현", note: "", status: "졸업" },
  { name: "송주랑", englishName: "", gender: "여", birthYear: "1989", phone: "714-788-6481", visitDate: "2026-04-05", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "최원재", englishName: "", gender: "남", birthYear: "2004", phone: "714-322-7128", visitDate: "2026-04-12", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "강민주", englishName: "", gender: "여", birthYear: "1997", phone: "951-329-0294", visitDate: "2026-04-12", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "이재민", englishName: "", gender: "남", birthYear: "1993", phone: "213-476-7403", visitDate: "2026-04-12", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "김동환", englishName: "", gender: "남", birthYear: "1989", phone: "213-571-8839", visitDate: "2026-04-12", inviter: "", leader: "강예지", note: "", status: "졸업" },
  { name: "이유준", englishName: "", gender: "남", birthYear: "1996", phone: "408-560-6009", visitDate: "2026-04-19", inviter: "", leader: "원하은", note: "", status: "졸업" },
  { name: "김규리", englishName: "", gender: "여", birthYear: "", phone: "949-350-0465", visitDate: "2026-04-26", inviter: "", leader: "이수아", note: "", status: "졸업" },
  { name: "배윤서", englishName: "", gender: "여", birthYear: "1997", phone: "213-924-0903", visitDate: "2026-05-03", inviter: "", leader: "원하은", note: "", status: "졸업" },
  { name: "하준오", englishName: "", gender: "남", birthYear: "1989", phone: "318-709-3774", visitDate: "2026-05-03", inviter: "", leader: "원하은", note: "", status: "졸업" },
];

interface ListMember {
  name: string;
  englishName: string;
  gender: string;
  birthYear: string;
  birthday: string;
  phone: string;
  visitDate: string;
  leader: string;
  note: string;
  status: string;
}

const LIST_MEMBERS: ListMember[] = [
  { name: "조은별", englishName: "", gender: "여", birthYear: "1994", birthday: "1994-12-30", phone: "213-263-8625", visitDate: "2026-05-10", leader: "이수아", note: "", status: "등록" },
  { name: "김상준", englishName: "", gender: "남", birthYear: "1996", birthday: "1996-12-02", phone: "213-703-9989", visitDate: "2026-05-10", leader: "이수아", note: "", status: "등록" },
  { name: "Jenny Yang", englishName: "", gender: "여", birthYear: "1989", birthday: "1989-03-23", phone: "562-405-0669", visitDate: "2026-05-10", leader: "원하은", note: "", status: "졸업" },
  { name: "전승구", englishName: "", gender: "남", birthYear: "1994", birthday: "1994-12-04", phone: "714-356-2541", visitDate: "2026-05-17", leader: "김슬기", note: "", status: "등록" },
  { name: "박준", englishName: "", gender: "남", birthYear: "1997", birthday: "1997-09-25", phone: "930-904-4102", visitDate: "2026-05-17", leader: "김슬기", note: "", status: "등록" },
  { name: "김은지", englishName: "", gender: "여", birthYear: "1994", birthday: "1994-08-20", phone: "213-392-5120", visitDate: "2026-05-17", leader: "김슬기", note: "", status: "등록" },
  { name: "이상윤", englishName: "", gender: "남", birthYear: "1994", birthday: "1994-08-24", phone: "951-456-9478", visitDate: "2026-05-17", leader: "김슬기", note: "", status: "졸업" },
  { name: "김건남", englishName: "", gender: "남", birthYear: "1999", birthday: "1999-09-11", phone: "714-476-8121", visitDate: "2026-05-24", leader: "김슬기", note: "", status: "졸업" },
  { name: "계명석", englishName: "", gender: "남", birthYear: "1999", birthday: "1999-02-07", phone: "858-214-9626", visitDate: "2026-05-24", leader: "김슬기", note: "", status: "졸업" },
  { name: "손진욱", englishName: "", gender: "남", birthYear: "1993", birthday: "1993-12-12", phone: "714-732-1162", visitDate: "2026-05-24", leader: "김슬기", note: "", status: "졸업" },
  { name: "윤재현", englishName: "", gender: "남", birthYear: "2004", birthday: "2004-05-03", phone: "765-715-0277", visitDate: "2026-05-24", leader: "김슬기", note: "", status: "등록" },
  { name: "전서영", englishName: "", gender: "여", birthYear: "2003", birthday: "2003-01-04", phone: "657-319-5817", visitDate: "2026-05-31", leader: "이수아", note: "", status: "등록" },
  { name: "이채림", englishName: "", gender: "여", birthYear: "2001", birthday: "2001-10-05", phone: "213-646-3460", visitDate: "2026-05-31", leader: "이수아", note: "", status: "등록" },
  { name: "유승민", englishName: "", gender: "남", birthYear: "1998", birthday: "1998-02-07", phone: "657-706-6938", visitDate: "2026-05-31", leader: "이수아", note: "", status: "등록" },
  { name: "권태영", englishName: "James Kwon", gender: "남", birthYear: "1995", birthday: "1995-08-03", phone: "714-745-5762", visitDate: "2026-05-31", leader: "이수아", note: "", status: "등록" },
  { name: "김효중", englishName: "", gender: "남", birthYear: "2004", birthday: "2004-06-07", phone: "714-450-2858", visitDate: "2026-06-07", leader: "강예지", note: "", status: "등록" },
  { name: "이현아", englishName: "", gender: "여", birthYear: "2000", birthday: "2000-11-23", phone: "714-726-7063", visitDate: "2026-06-07", leader: "강예지", note: "", status: "등록" },
  { name: "최예진", englishName: "", gender: "여", birthYear: "2004", birthday: "2004-09-27", phone: "714-300-4125", visitDate: "2026-06-07", leader: "강예지", note: "", status: "등록" },
  { name: "홍동호", englishName: "", gender: "남", birthYear: "2003", birthday: "2003-12-02", phone: "626-720-2787", visitDate: "2026-06-07", leader: "강예지", note: "", status: "등록" },
  { name: "김소영", englishName: "", gender: "여", birthYear: "1990", birthday: "1990-03-18", phone: "626-476-7744", visitDate: "2026-06-07", leader: "이명원", note: "", status: "등록" },
  { name: "조인", englishName: "", gender: "남", birthYear: "2003", birthday: "2003-01-22", phone: "714-732-0932", visitDate: "2026-06-07", leader: "강예지", note: "", status: "등록" },
  { name: "최유빈", englishName: "", gender: "남", birthYear: "2004", birthday: "2004-04-06", phone: "949-466-0917", visitDate: "2026-06-07", leader: "강예지", note: "", status: "등록" },
  { name: "오창수", englishName: "", gender: "남", birthYear: "1987", birthday: "1987-04-10", phone: "949-422-1615", visitDate: "2026-06-14", leader: "이명원", note: "", status: "등록" },
  { name: "김정희", englishName: "", gender: "여", birthYear: "1991", birthday: "1991-07-18", phone: "310-569-3100", visitDate: "2026-06-14", leader: "이명원", note: "", status: "등록" },
  { name: "한창묵", englishName: "", gender: "남", birthYear: "1987", birthday: "1987-09-06", phone: "714-323-6509", visitDate: "2026-06-14", leader: "이명원", note: "", status: "등록" },
  // Duplicate of 김소영 above (same name/leader, different DOB in source sheet) — kept verbatim per plan, flagged as likely sheet error.
  { name: "김소영", englishName: "", gender: "여", birthYear: "1987", birthday: "1987-09-06", phone: "714-323-6509", visitDate: "2026-06-14", leader: "이명원", note: "", status: "등록" },
  { name: "김시우", englishName: "", gender: "남", birthYear: "1999", birthday: "1999-03-30", phone: "714-804-3694", visitDate: "2026-06-21", leader: "배창현", note: "", status: "등록" },
  { name: "이성주", englishName: "", gender: "여", birthYear: "2001", birthday: "2001-11-27", phone: "108-024-2727", visitDate: "2026-06-21", leader: "배창현", note: "", status: "등록" },
  { name: "염승호", englishName: "", gender: "남", birthYear: "1997", birthday: "1997-03-29", phone: "714-321-0965", visitDate: "2026-06-21", leader: "배창현", note: "", status: "등록" },
  { name: "유지상", englishName: "", gender: "남", birthYear: "1997", birthday: "1997-02-14", phone: "551-330-2105", visitDate: "2026-06-28", leader: "배창현", note: "", status: "등록" },
  { name: "정우영", englishName: "", gender: "남", birthYear: "1987", birthday: "1987-07-23", phone: "310-560-4889", visitDate: "2026-07-05", leader: "이보령", note: "", status: "등록" },
  { name: "김성은", englishName: "", gender: "여", birthYear: "2001", birthday: "2001-03-31", phone: "267-903-5478", visitDate: "2026-07-05", leader: "이승우", note: "", status: "등록" },
  { name: "Clay Kim", englishName: "", gender: "남", birthYear: "1993", birthday: "1993-12-07", phone: "909-913-9017", visitDate: "2026-07-05", leader: "이보령", note: "", status: "등록" },
  { name: "James Lee", englishName: "", gender: "남", birthYear: "1996", birthday: "1996-12-03", phone: "503-750-3695", visitDate: "2026-07-05", leader: "이보령", note: "", status: "등록" },
  { name: "이윤수", englishName: "", gender: "남", birthYear: "1994", birthday: "1994-01-31", phone: "310-597-7769", visitDate: "2026-07-12", leader: "", note: "신혼부부 이동", status: "방문" },
  { name: "김민재", englishName: "", gender: "여", birthYear: "1997", birthday: "1997-03-27", phone: "310-999-7271", visitDate: "2026-07-12", leader: "", note: "신혼부부 이동", status: "방문" },
  { name: "박예찬", englishName: "", gender: "남", birthYear: "1994", birthday: "1994-03-15", phone: "714-348-8389", visitDate: "2026-07-12", leader: "이승우", note: "", status: "등록" },
  { name: "김지인", englishName: "", gender: "여", birthYear: "1997", birthday: "1997-07-15", phone: "617-470-4448", visitDate: "2026-07-12", leader: "이승우", note: "", status: "등록" },
  { name: "이소민", englishName: "", gender: "여", birthYear: "1998", birthday: "1998-07-14", phone: "413-427-2166", visitDate: "2026-07-19", leader: "이보령", note: "", status: "등록" },
  { name: "박지호", englishName: "", gender: "여", birthYear: "2003", birthday: "2003-05-09", phone: "657-347-8914", visitDate: "2026-07-19", leader: "이보령", note: "", status: "등록" },
];

async function main() {
  console.log("Clearing ShalomMember (current list)...");
  const delMembers = await prisma.shalomMember.deleteMany({});
  console.log(`  deleted ${delMembers.count} member row(s).`);

  console.log("Clearing ShalomHistory (archive)...");
  const delHistory = await prisma.shalomHistory.deleteMany({});
  console.log(`  deleted ${delHistory.count} history row(s).`);

  console.log("Creating history folders (by status)...");
  const folders: Array<[string, HistoryPerson[]]> = [
    ["2026년 1월-6월 방문", HISTORY_VISIT],
    ["2026년 1월-6월 등록", HISTORY_REGISTER],
    ["2026년 1월-6월 졸업", HISTORY_GRADUATE],
  ];

  for (let i = 0; i < folders.length; i++) {
    const [name, people] = folders[i];
    const withIds = people.map((p) => ({ id: crypto.randomUUID(), ...p }));
    const folder = await prisma.shalomHistory.create({
      data: {
        name,
        type: "FOLDER",
        data: JSON.stringify(withIds),
        parentId: null,
        order: i,
      },
    });
    console.log(`  created "${name}" (${folder.id}) with ${withIds.length} people.`);
  }

  console.log("Creating current Shalom list members...");
  for (let i = 0; i < LIST_MEMBERS.length; i++) {
    const m = LIST_MEMBERS[i];
    await prisma.shalomMember.create({
      data: {
        name: m.name,
        englishName: m.englishName,
        gender: m.gender,
        birthYear: m.birthYear,
        birthday: m.birthday,
        phone: m.phone,
        visitDate: m.visitDate,
        inviter: "",
        leader: m.leader,
        note: m.note,
        status: m.status,
        order: i,
      },
    });
  }
  console.log(`  created ${LIST_MEMBERS.length} member(s).`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
