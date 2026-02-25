<template>
  <div class="dating-container">
    <div class="ended-message">
      <div class="heart-icon">🤍</div>
      <p class="period">{{ startDate }} ~ {{ endDate }}</p>
      <p class="dday-line">함께한 {{ totalDays }}일</p>
    </div>
  </div>
</template>

<script>
export default {
  name: "DatingPage",
  setup() {
    // 시작일(첫만남 또는 사귄날) / 종료일 고정
    const startDate = "2025-08-18";
    const endDate = "2026-02-21";

    const parseLocal = (ymd) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const start = parseLocal(startDate);
    const end = parseLocal(endDate);
    const diffMs = end - start;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const fmt = (ymd) => {
      const [y, m, d] = ymd.split("-");
      return `${y}년 ${Number(m)}월 ${Number(d)}일`;
    };

    return {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      totalDays,
    };
  },
};
</script>

<style scoped>
.dating-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.ended-message {
  text-align: center;
  color: #aaa;
}

.heart-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.period {
  font-size: 1rem;
  margin-bottom: 8px;
  color: #bbb;
}

.dday-line {
  font-size: 1.4rem;
  font-weight: 600;
  color: #ccc;
}
</style>
