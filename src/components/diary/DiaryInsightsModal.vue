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

<style src="@/assets/css/components/diary/diary-insights-modal.css" scoped></style>
