// 일정 항목 유형 — AI 플래너 결과와 예정 일정 편집기에서 공통 사용
export const ITEM_TYPES = ["관광", "식당", "카페", "호텔", "이동", "기타"];

const ICONS = {
  관광: "🗺️",
  식당: "🍽️",
  카페: "☕",
  호텔: "🏨",
  이동: "🚆",
  기타: "📍",
};

export function typeIcon(type) {
  return ICONS[type] || ICONS["기타"];
}

export const TIME_OPTIONS = ["오전", "점심", "오후", "저녁", "밤"];
