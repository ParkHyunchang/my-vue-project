<template>
  <div class="insight-card trend-card">
    <div class="insight-card-header">
      <h3 class="insight-title">📈 최근 12개월 지출 추이</h3>
      <span class="insight-sub">활성/일시정지 구독 · 월 환산</span>
    </div>
    <div v-if="hasData" ref="chartEl" class="trend-chart" />
    <div v-else class="insight-empty">
      차트를 그릴 구독 데이터가 없습니다.
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as echarts from 'echarts';

function toMonthly(s) {
  const amount = s.amount || 0;
  switch (s.billingCycle) {
    case 'WEEKLY': return amount * 4.345;
    case 'YEARLY': return amount / 12;
    case 'MONTHLY':
    default:       return amount;
  }
}

// 두 LocalDate(YYYY-MM-DD) 문자열 / Date를 비교해서 a월 ≥ b월 인지
function ymKey(d) {
  return d.getFullYear() * 12 + d.getMonth();
}

export default {
  name: 'SubscriptionTrendChart',
  props: {
    subscriptions: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
  },
  setup(props) {
    const chartEl = ref(null);
    let chartInstance = null;

    const includedList = computed(() =>
      props.subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'PAUSED')
    );

    const monthsData = computed(() => {
      const today = new Date();
      today.setDate(1);
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
          y: d.getFullYear(),
          m: d.getMonth(),
          label: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
          total: 0,
        });
      }

      const todayKey = ymKey(new Date(today.getFullYear(), today.getMonth(), 1));
      const earliestKey = months[0].y * 12 + months[0].m;

      for (const sub of includedList.value) {
        const monthlyAmount = toMonthly(sub);
        if (monthlyAmount <= 0) continue;

        let startKey = earliestKey;
        if (sub.startedAt) {
          const sd = new Date(sub.startedAt);
          startKey = sd.getFullYear() * 12 + sd.getMonth();
        }

        for (const m of months) {
          const k = m.y * 12 + m.m;
          // 시작 전이면 미반영
          if (k < startKey) continue;
          // PAUSED 는 현재 달 기준 이후 미래엔 의미 없지만, 과거 12개월 안엔 모두 반영
          // (일시정지 시점을 따로 저장하지 않으므로 보수적으로 포함)
          if (k > todayKey) continue;
          m.total += monthlyAmount;
        }
      }
      return months.map(m => ({ ...m, total: Math.round(m.total) }));
    });

    const hasData = computed(() => monthsData.value.some(m => m.total > 0));

    const buildOption = () => {
      const data = monthsData.value;
      return {
        backgroundColor: 'transparent',
        grid: { top: 20, right: 16, bottom: 30, left: 56 },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(28, 28, 40, 0.95)',
          borderColor: 'rgba(201, 169, 110, 0.3)',
          borderWidth: 1,
          textStyle: { color: '#f0ece4', fontSize: 12 },
          formatter: (params) => {
            const p = params[0];
            return `${p.axisValue}<br/><strong style="color:#c9a96e">₩${props.formatCurrency(p.value)}</strong>`;
          },
        },
        xAxis: {
          type: 'category',
          data: data.map(d => d.label),
          axisLine: { lineStyle: { color: 'rgba(201, 169, 110, 0.2)' } },
          axisLabel: { color: '#8a8580', fontSize: 11, interval: 0, rotate: 0 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisLabel: {
            color: '#8a8580',
            fontSize: 11,
            formatter: (v) => v >= 10000 ? `${Math.round(v / 10000)}만` : v,
          },
          splitLine: { lineStyle: { color: 'rgba(201, 169, 110, 0.08)' } },
        },
        series: [{
          type: 'line',
          smooth: true,
          data: data.map(d => d.total),
          lineStyle: { color: '#c9a96e', width: 2.5 },
          itemStyle: { color: '#c9a96e' },
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(201, 169, 110, 0.32)' },
              { offset: 1, color: 'rgba(201, 169, 110, 0.02)' },
            ]),
          },
        }],
      };
    };

    const render = async () => {
      if (!hasData.value) return;
      await nextTick();
      if (!chartEl.value) return;
      if (!chartInstance) {
        chartInstance = echarts.init(chartEl.value, 'dark');
      }
      chartInstance.setOption(buildOption(), true);
    };

    const handleResize = () => chartInstance?.resize();

    onMounted(async () => {
      window.addEventListener('resize', handleResize);
      await render();
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      chartInstance?.dispose();
      chartInstance = null;
    });

    watch(() => props.subscriptions, render, { deep: true });

    return { chartEl, hasData };
  },
};
</script>

<style src="@/assets/css/subscription.css" scoped></style>
