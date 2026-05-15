import { Priority } from "@/types/memory";

export interface AnalyzeResult {
  summary: string;
  category: string;
  keywords: string[];
  place: string;
  todo: boolean;
  priority: Priority;
}

// ── 불용어 ───────────────────────────────────────────────────
const STOPWORDS = new Set([
  "이", "가", "을", "를", "은", "는", "의", "에", "에서", "로", "으로",
  "와", "과", "도", "만", "부터", "까지", "라", "이라", "이고", "하고",
  "그", "저", "것", "수", "때", "및", "등", "더", "또", "잘",
  "좀", "다", "안", "못", "안됨", "됨", "함", "있음", "없음", "함께",
  "그냥", "아직", "그리고", "하지만", "그런데", "그래서",
]);

// ── 카테고리 규칙 (위에서부터 첫 매칭 사용, 미모마켓 최우선) ─
const CATEGORY_RULES: { keywords: string[]; category: string }[] = [
  // ① 미모마켓 (최우선)
  {
    keywords: [
      "미모마켓", "공구", "공동구매", "카페24", "지마켓", "옥션",
      "상세페이지", "홀리지", "여우", "제로샵", "바이제니", "디오더스",
      "통관번호", "개인통관", "입금자", "수령인", "택배", "송장",
      "상품등록", "주문서",
    ],
    category: "미모마켓",
  },
  // ② 콘텐츠
  {
    keywords: [
      "순자", "순자시리즈", "유튜브", "쇼츠", "롱폼", "릴스",
      "대본", "썸네일", "설명문", "해시태그", "댓글", "조회수",
      "구독자", "ai영상", "나레이션",
    ],
    category: "콘텐츠",
  },
  // ③ AI자동화
  {
    keywords: [
      "클로드코드", "마누스", "make", "노션", "firebase", "firestore",
      "api", "gpt", "자동화", "크롤링", "파이썬", "구글시트",
      "스프레드시트", "vercel", "next.js", "nextjs", "react",
    ],
    category: "AI자동화",
  },
  // ④ 쇼핑
  {
    keywords: [
      "다이소", "쿠팡", "마트", "장보기", "사야", "구매", "리스트",
      "수납", "세탁망", "지퍼백", "후크", "쇼핑",
    ],
    category: "쇼핑",
  },
  // ⑤ 금융
  {
    keywords: [
      "etf", "주식", "배당", "isa", "삼성", "하이닉스", "현대차",
      "두산", "투자", "포트폴리오",
    ],
    category: "금융",
  },
  // ⑥ 건강
  {
    keywords: ["병원", "약", "건강", "진료", "예약"],
    category: "건강",
  },
  // ⑦ 학교
  {
    keywords: ["학교", "수업", "과제", "교수님", "일본어"],
    category: "학교",
  },
  // ⑧ 부동산
  {
    keywords: ["부동산", "전세", "매매", "청약", "대출"],
    category: "부동산",
  },
];

// ── 장소 규칙 ─────────────────────────────────────────────────
const PLACE_RULES: { keyword: string; place: string }[] = [
  { keyword: "다이소",  place: "다이소"  },
  { keyword: "쿠팡",   place: "쿠팡"    },
  { keyword: "마트",   place: "마트"    },
  { keyword: "병원",   place: "병원"    },
  { keyword: "은행",   place: "은행"    },
  { keyword: "우체국", place: "우체국"  },
  { keyword: "학교",   place: "학교"    },
  { keyword: "카페",   place: "카페"    },
  { keyword: "일본",   place: "일본"    },
  { keyword: "한국",   place: "한국"    },
];

// ── 할 일 키워드 ──────────────────────────────────────────────
const TODO_KEYWORDS = [
  "해야", "사야", "확인", "예약", "등록", "업로드",
  "수정", "전화", "보내기", "입금", "방문", "만들기",
  "올려야", "찍어야", "보내야", "주문해야", "정리해야",
];

// ── 우선순위 키워드 ───────────────────────────────────────────
const PRIORITY_HIGH = [
  "오늘", "지금", "급함", "빨리", "꼭", "필수",
  "까먹지마", "잊지마",
];
const PRIORITY_LOW = ["나중", "언젠가", "참고"];

// ── 메인 함수 ─────────────────────────────────────────────────
export function analyzeMemory(rawText: string): AnalyzeResult {
  const lower = rawText.toLowerCase();

  // 1. category — 미모마켓 최우선, 위에서부터 첫 매칭
  const category =
    CATEGORY_RULES.find((rule) =>
      rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))
    )?.category ?? "기타";

  // 2. place
  const place =
    PLACE_RULES.find((rule) =>
      lower.includes(rule.keyword.toLowerCase())
    )?.place ?? "기타";

  // 3. todo
  const todo = TODO_KEYWORDS.some((kw) => rawText.includes(kw));

  // 4. priority
  const priority: Priority = PRIORITY_HIGH.some((kw) => rawText.includes(kw))
    ? "높음"
    : PRIORITY_LOW.some((kw) => rawText.includes(kw))
    ? "낮음"
    : "보통";

  // 5. keywords — 최대 12개
  //    토크나이징 → 불용어 제거 → 중복 제거 → 최대 12개
  const tokens = rawText
    .split(/[\s,\.!?~\-\(\)\[\]「」【】・:\/\n]+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (t.length < 2) return false;
      if (STOPWORDS.has(t)) return false;
      if (/^\d+$/.test(t)) return false; // 숫자만 제외
      return true;
    });

  const keywords = [...new Set(tokens)].slice(0, 12);

  // 6. summary
  const summary =
    rawText.length <= 60 ? rawText : rawText.slice(0, 60) + "...";

  return { summary, category, keywords, place, todo, priority };
}
