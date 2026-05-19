<template>
  <Modal @close="$emit('close')">
    <template #header>
      <div class="insight-modal-header">
        <span>📊 일기 인사이트</span>
        <span class="insight-count">{{ analyzedCount }}건 분석됨 · 전체 {{ entries.length }}건</span>
      </div>
    </template>

    <template #body>
      <div v-if="!entries.length" class="diary-insight-empty">
        아직 작성된 일기가 없습니다.
      </div>
      <div v-else-if="!analyzedCount" class="diary-insight-empty">
        AI 분석된 일기가 없습니다. 일기를 열고 ✨ AI 분석 버튼을 눌러보세요.
      </div>

      <template v-else>
        <!-- 1. 월별 추이 -->
        <section class="insight-section">
          <h4 class="insight-section-title">📈 최근 6개월 감정 점수 추이</h4>
          <div v-if="trendHasData" ref="trendChartEl" class="mood-trend-chart" />
          <div v-else class="diary-insight-empty mini">최근 6개월 분석 데이터 없음</div>
        </section>

        <!-- 2. 감정 빈도 -->
        <section class="insight-section">
          <h4 class="insight-section-title">😊 자주 등장한 감정</h4>
          <ul class="mood-freq-list">
            <li v-for="m in moodFrequency" :key="m.mood" class="mood-freq-row">
              <span class="mood-freq-label">{{ m.mood }}</span>
              <div class="mood-freq-bar">
                <div class="mood-freq-fill" :style="{ width: m.pct + '%' }"></div>
              </div>
              <span class="mood-freq-count">{{ m.count }}회</span>
            </li>
          </ul>
        </section>

        <!-- 3. 키워드 -->
        <section class="insight-section">
          <h4 class="insight-section-title">🏷 자주 등장한 키워드 (Top {{ topKeywords.length }})</h4>
          <div v-if="topKeywords.length" class="keyword-cloud">
            <span
              v-for="kw in topKeywords"
              :key="kw.text"
              class="kw-cloud-tag"
              :style="{ fontSize: kw.fontSize + 'px', opacity: kw.opacity }"
              :title="`${kw.count}회`"
            >
              #{{ kw.text }}<em class="kw-count">{{ kw.count }}</em>
            </span>
          </div>
          <div v-else class="diary-insight-empty mini">키워드 없음</div>
        </section>

        <!-- 4. 검색 -->
        <section class="insight-section">
          <h4 class="insight-section-title">🔍 검색</h4>
          <input
            v-model="searchText"
            type="text"
            class="insight-search-input"
            placeholder="감정·키워드·내용으로 검색"
          />
          <div v-if="moodFrequency.length > 1" class="insight-search-chips">
            <button
              v-for="m in moodFrequency.slice(0, 6)"
              :key="m.mood"
              :class="['ins-chip', { active: moodFilter === m.mood }]"
              @click="toggleMoodFilter(m.mood)"
            >{{ m.mood }} <span class="ins-chip-count">{{ m.count }}</span></button>
            <button v-if="moodFilter" class="ins-chip reset" @click="moodFilter = ''">초기화</button>
          </div>

          <div class="insight-search-meta">검색 결과 {{ searchResults.length }}건</div>
          <ul class="insight-search-results">
            <li
              v-for="e in searchResults"
              :key="e.id"
              class="ins-result-row"
              @click="$emit('select', e)"
            >
              <span class="ins-result-mood">{{ moodOf(e) || '📝' }}</span>
              <div class="ins-result-body">
                <div class="ins-result-meta">
                  <span class="ins-result-date">{{ formatDate(e.diaryDate) }}</span>
                  <span v-if="moodScoreOf(e) !== null" class="ins-result-score">{{ moodScoreOf(e) }}/10</span>
                </div>
                <div class="ins-result-preview">{{ previewText(e.content) }}</div>
                <div v-if="keywordsOf(e).length" class="ins-result-keywords">
                  <span v-for="kw in keywordsOf(e)" :key="kw" class="ins-result-kw">#{{ kw }}</span>
                </div>
              </div>
            </li>
            <li v-if="!searchResults.length" class="ins-result-empty">조건에 맞는 일기가 없습니다.</li>
          </ul>
        </section>
      </template>
    </template>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('close')">닫기</button>
    </template>
  </Modal>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import Modal from '@/components/Modal.vue';

function parseAnalysis(raw) {
  if (!raw) return null;
  try {
    const s = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default {
  name: 'DiaryInsightsModal',
  components: { Modal },
  props: {
    entries: { type: Array, required: true },
  },
  emits: ['close', 'select'],
  setup(props) {
    const trendChartEl = ref(null);
    let trendChartInstance = null;

    const searchText = ref('');
    const moodFilter = ref('');

    // 분석 결과 캐싱
    const analyzedEntries = computed(() =>
      props.entries
        .map(e => ({ ...e, _a: parseAnalysis(e.aiAnalysis) }))
        .filter(e => e._a)
    );

    const analyzedCount = computed(() => analyzedEntries.value.length);

    // ── 월별 점수 추이 ────────────────────────
    const trendMonths = computed(() => {
      const today = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
          key: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
          scores: [],
        });
      }
      const idxByKey = new Map(months.map((m, i) => [m.key, i]));

      for (const e of analyzedEntries.value) {
        const k = monthKey(e.diaryDate);
        const idx = idxByKey.get(k);
        if (idx === undefined) continue;
        const score = Number(e._a?.moodScore);
        if (!Number.isFinite(score)) continue;
        months[idx].scores.push(score);
      }
      return months.map(m => ({
        key: m.key,
        avg: m.scores.length ? +(m.scores.reduce((s, x) => s + x, 0) / m.scores.length).toFixed(1) : null,
        count: m.scores.length,
      }));
    });

    const trendHasData = computed(() => trendMonths.value.some(m => m.count > 0));

    const buildTrendOption = () => {
      const data = trendMonths.value;
      return {
        backgroundColor: 'transparent',
        grid: { top: 20, right: 16, bottom: 30, left: 36 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(28, 28, 40, 0.95)',
          borderColor: 'rgba(201, 169, 110, 0.3)',
          borderWidth: 1,
          textStyle: { color: '#f0ece4', fontSize: 12 },
          formatter: (params) => {
            const p = params[0];
            const m = data[p.dataIndex];
            if (m.avg === null) return `${p.axisValue}<br/><span style="color:#8a8580">분석 데이터 없음</span>`;
            return `${p.axisValue}<br/><strong style="color:#c9a96e">평균 ${m.avg}/10</strong><br/><span style="color:#8a8580">${m.count}건 분석</span>`;
          },
        },
        xAxis: {
          type: 'category',
          data: data.map(d => d.key),
          axisLine: { lineStyle: { color: 'rgba(201, 169, 110, 0.2)' } },
          axisLabel: { color: '#8a8580', fontSize: 11 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 10,
          interval: 2,
          axisLine: { show: false },
          axisLabel: { color: '#8a8580', fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(201, 169, 110, 0.08)' } },
        },
        series: [{
          type: 'line',
          smooth: true,
          data: data.map(d => d.avg),
          connectNulls: true,
          lineStyle: { color: '#c9a96e', width: 2.5 },
          itemStyle: { color: '#c9a96e' },
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(201, 169, 110, 0.3)' },
              { offset: 1, color: 'rgba(201, 169, 110, 0.02)' },
            ]),
          },
        }],
      };
    };

    const renderTrend = async () => {
      if (!trendHasData.value) {
        trendChartInstance?.dispose();
        trendChartInstance = null;
        return;
      }
      await nextTick();
      if (!trendChartEl.value) return;
      if (!trendChartInstance) {
        trendChartInstance = echarts.init(trendChartEl.value, 'dark');
      }
      trendChartInstance.setOption(buildTrendOption(), true);
    };

    // ── 감정 빈도 ────────────────────────────
    const moodFrequency = computed(() => {
      const map = new Map();
      for (const e of analyzedEntries.value) {
        const m = (e._a?.mood || '').trim();
        if (!m) continue;
        map.set(m, (map.get(m) || 0) + 1);
      }
      const arr = Array.from(map.entries())
        .map(([mood, count]) => ({ mood, count }))
        .sort((a, b) => b.count - a.count);
      const max = arr[0]?.count || 1;
      return arr.map(x => ({ ...x, pct: Math.round((x.count / max) * 100) }));
    });

    // ── 키워드 ───────────────────────────────
    const topKeywords = computed(() => {
      const map = new Map();
      for (const e of analyzedEntries.value) {
        const kws = Array.isArray(e._a?.keywords) ? e._a.keywords : [];
        for (const kw of kws) {
          const k = String(kw).trim();
          if (!k) continue;
          map.set(k, (map.get(k) || 0) + 1);
        }
      }
      const arr = Array.from(map.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);
      const max = arr[0]?.count || 1;
      const min = arr[arr.length - 1]?.count || 1;
      // 크기: 13~22px 사이, 빈도 비례
      return arr.map(k => {
        const ratio = max === min ? 0.5 : (k.count - min) / (max - min);
        return {
          ...k,
          fontSize: Math.round(13 + ratio * 9),
          opacity: (0.7 + ratio * 0.3).toFixed(2),
        };
      });
    });

    // ── 검색 ──────────────────────────────────
    const toggleMoodFilter = (m) => {
      moodFilter.value = moodFilter.value === m ? '' : m;
    };

    const searchResults = computed(() => {
      const q = searchText.value.trim().toLowerCase();
      const mood = moodFilter.value;
      if (!q && !mood) return analyzedEntries.value.slice(0, 30);
      return analyzedEntries.value.filter(e => {
        if (mood && e._a?.mood !== mood) return false;
        if (!q) return true;
        const haystack = [
          e.content || '',
          e._a?.summary || '',
          e._a?.mood || '',
          (e._a?.keywords || []).join(' '),
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });
    });

    // ── 표시 헬퍼 ─────────────────────────────
    const moodOf = (e) => e._a?.mood || null;
    const moodScoreOf = (e) => {
      const n = Number(e._a?.moodScore);
      return Number.isFinite(n) ? n : null;
    };
    const keywordsOf = (e) => Array.isArray(e._a?.keywords) ? e._a.keywords.slice(0, 5) : [];
    const formatDate = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
    };
    const previewText = (text) => text ? text.slice(0, 50) + (text.length > 50 ? '...' : '') : '';

    // ── 라이프사이클 ──────────────────────────
    const handleResize = () => trendChartInstance?.resize();

    onMounted(async () => {
      window.addEventListener('resize', handleResize);
      await renderTrend();
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      trendChartInstance?.dispose();
      trendChartInstance = null;
    });

    watch(() => props.entries, renderTrend, { deep: true });

    return {
      trendChartEl,
      trendHasData,
      analyzedCount,
      moodFrequency,
      topKeywords,
      searchText,
      moodFilter,
      searchResults,
      toggleMoodFilter,
      moodOf,
      moodScoreOf,
      keywordsOf,
      formatDate,
      previewText,
    };
  },
};
</script>

<style scoped>
.insight-modal-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.insight-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
}

.diary-insight-empty {
  text-align: center;
  padding: 32px 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}
.diary-insight-empty.mini {
  padding: 18px 0;
}

.insight-section {
  margin-bottom: 22px;
}
.insight-section:last-child {
  margin-bottom: 0;
}
.insight-section-title {
  margin: 0 0 10px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* 추이 차트 */
.mood-trend-chart {
  width: 100%;
  height: 200px;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 8px;
  box-sizing: border-box;
}

/* 감정 빈도 */
.mood-freq-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mood-freq-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}
.mood-freq-label {
  min-width: 90px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
.mood-freq-bar {
  flex: 1;
  height: 8px;
  background: var(--surface-2);
  border-radius: 99px;
  overflow: hidden;
}
.mood-freq-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: 99px;
  transition: width 0.4s ease;
}
.mood-freq-count {
  color: var(--accent);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  min-width: 36px;
  text-align: right;
}

/* 키워드 클라우드 */
.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  padding: 10px;
  background: var(--surface-2);
  border-radius: 8px;
  border: 1px solid var(--card-border);
}
.kw-cloud-tag {
  color: var(--accent);
  font-weight: 600;
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
}
.kw-cloud-tag .kw-count {
  font-style: normal;
  font-size: 0.7em;
  color: var(--text-muted);
  font-weight: 400;
}

/* 검색 */
.insight-search-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 0.88rem;
  box-sizing: border-box;
}
.insight-search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--input-focus-shadow);
}
.insight-search-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.ins-chip {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
}
.ins-chip:hover {
  background: var(--card-bg-hover);
  color: var(--text-primary);
}
.ins-chip.active {
  background: var(--accent-dim);
  color: var(--accent-light);
  border-color: var(--card-border-strong);
}
.ins-chip.reset {
  color: var(--danger-color);
  border-color: var(--danger-color);
}
.ins-chip-count {
  margin-left: 4px;
  font-size: 0.7rem;
  opacity: 0.7;
}
.insight-search-meta {
  margin-top: 12px;
  margin-bottom: 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.insight-search-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}
.ins-result-row {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.ins-result-row:hover {
  background: var(--card-bg-hover);
  border-color: var(--card-border-strong);
}
.ins-result-mood {
  font-size: 1.4rem;
  flex-shrink: 0;
  line-height: 1;
}
.ins-result-body {
  flex: 1;
  min-width: 0;
}
.ins-result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.ins-result-date {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.ins-result-score {
  font-size: 0.72rem;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.ins-result-preview {
  font-size: 0.82rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ins-result-keywords {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ins-result-kw {
  font-size: 0.7rem;
  color: var(--accent);
  background: var(--accent-dim);
  padding: 1px 6px;
  border-radius: 999px;
}
.ins-result-empty {
  text-align: center;
  padding: 24px 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  background: var(--surface-2);
  border-radius: 8px;
}

/* 모바일 */
@media (max-width: 600px) {
  .mood-freq-label {
    min-width: 70px;
    font-size: 0.78rem;
  }
  .mood-trend-chart {
    height: 170px;
  }
  .insight-search-results {
    max-height: none;
  }
}
</style>
