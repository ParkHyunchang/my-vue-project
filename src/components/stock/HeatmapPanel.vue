<template>
  <div>
    <div class="heatmap-controls">
      <button
        :class="['market-btn', { active: heatmapMarket === 'kr' }]"
        @click="switchHeatmap('kr')"
      >
        🇰🇷 국내 (KOSPI)
      </button>
      <button
        :class="['market-btn', { active: heatmapMarket === 'sp500' }]"
        @click="switchHeatmap('sp500')"
      >
        🇺🇸 S&amp;P 500
      </button>
      <button
        :class="['market-btn', { active: heatmapMarket === 'nasdaq' }]"
        @click="switchHeatmap('nasdaq')"
      >
        🇺🇸 NASDAQ 100
      </button>
    </div>

    <!-- 국내 히트맵 (ECharts) -->
    <div v-if="heatmapMarket === 'kr'" class="heatmap-wrapper">
      <div
        v-if="!krHeatmapLoading && !krHeatmapError && krUpdatedAt"
        class="kr-heatmap-header"
      >
        📅 {{ krUpdatedAt }} 기준 데이터
        <span class="kr-sync-note">(매 30분마다 자동 동기화)</span>
      </div>
      <div v-if="krHeatmapLoading" class="heatmap-loading">
        <span class="loading-spinner"></span> 데이터 로딩 중…
      </div>
      <div v-else-if="krHeatmapError" class="heatmap-error">
        {{ krHeatmapError }}
      </div>
      <div v-else ref="krChartEl" class="kr-heatmap-chart"></div>
      <p class="widget-credit">국내 데이터 제공: KRX 공식 Open API (전일 종가 기준)</p>
    </div>

    <!-- 해외 히트맵 (TradingView) -->
    <div v-else class="heatmap-wrapper">
      <div v-if="tvUpdatedAt" class="kr-heatmap-header">
        📅 {{ tvUpdatedAt }} 로드
        <span
          :class="[
            'tv-market-status',
            isUsMarketOpen() ? 'market-open' : 'market-closed',
          ]"
        >
          {{ isUsMarketOpen() ? "🟢 장중" : "🔴 장외" }}
        </span>
        <span class="kr-sync-note">
          (TradingView 실시간 위젯 · 장중 자동 업데이트 · NYSE/NASDAQ
          22:30~05:00 KST)
        </span>
      </div>
      <div id="tv-heatmap" class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
      <p class="widget-credit">
        데이터 제공:
        <a href="https://www.tradingview.com" target="_blank">TradingView</a>
      </p>
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import axios from "@/axios";
import { logAudit } from "@/utils/audit";
import * as echarts from "echarts";

export default {
  name: "HeatmapPanel",
  props: {
    active: { type: Boolean, default: false },
  },
  setup(props) {
    const heatmapMarket = ref("kr");
    const krChartEl = ref(null);
    const krHeatmapLoading = ref(false);
    const krHeatmapError = ref("");
    const krUpdatedAt = ref("");
    const tvUpdatedAt = ref("");
    let krChartInstance = null;
    let krHeatmapSectorsCache = null;

    function isUsMarketOpen() {
      const now = new Date();
      const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      const day = kst.getDay();
      const h = kst.getHours(), m = kst.getMinutes();
      const minutes = h * 60 + m;
      if (day === 0 || day === 6) return false;
      return minutes >= 22 * 60 + 30 || minutes < 5 * 60;
    }

    function heatColor(pct) {
      if (pct >= 4) return "#0ecb81";
      if (pct >= 2) return "#1a9e64";
      if (pct >= 0.5) return "#0d7a4e";
      if (pct >= 0) return "#1a4a35";
      if (pct > -0.5) return "#5e1a1a";
      if (pct > -2) return "#b03030";
      if (pct > -4) return "#d94040";
      return "#ff4d4d";
    }

    function buildKrOption(sectors) {
      const isMobile = window.innerWidth <= 768;
      const nameFontSize = isMobile ? 14 : 12;
      const pctFontSize = isMobile ? 12 : 11;
      const upperHeight = isMobile ? 32 : 28;
      const upperFontSize = isMobile ? 13 : 13;

      const treeData = sectors.map((sector) => ({
        name: sector.sector,
        children: sector.stocks.map((s) => ({
          name: s.name,
          value: s.marketCap,
          changePct: s.changePercent,
          price: s.price,
          symbol: s.symbol,
          itemStyle: { color: heatColor(s.changePercent) },
        })),
      }));

      return {
        backgroundColor: "transparent",
        tooltip: {
          formatter(info) {
            const d = info.data;
            if (!d.changePct && d.changePct !== 0) return d.name;
            const sign = d.changePct >= 0 ? "+" : "";
            return `<b>${d.name}</b><br/>
                    ${d.price?.toLocaleString("ko-KR")}원<br/>
                    ${sign}${d.changePct.toFixed(2)}%`;
          },
        },
        series: [
          {
            type: "treemap",
            roam: false,
            nodeClick: false,
            visibleMin: isMobile ? 800 : 400,
            breadcrumb: { show: true, itemStyle: { color: "#2a2a3e" } },
            label: {
              show: true,
              formatter(p) {
                const d = p.data;
                if (!d.changePct && d.changePct !== 0) return p.name;
                const sign = d.changePct >= 0 ? "+" : "";
                return `{name|${d.name}}\n{pct|${sign}${d.changePct.toFixed(2)}%}`;
              },
              rich: {
                name: { fontSize: nameFontSize, fontWeight: "bold", color: "#fff" },
                pct: { fontSize: pctFontSize, color: "rgba(255,255,255,0.9)" },
              },
            },
            upperLabel: {
              show: true,
              height: upperHeight,
              color: "#fff",
              fontWeight: "bold",
              fontSize: upperFontSize,
              backgroundColor: "rgba(0,0,0,0.45)",
            },
            itemStyle: { borderColor: "#1a1a2e", borderWidth: 2, gapWidth: 2 },
            levels: [
              { itemStyle: { borderColor: "#555", borderWidth: 3, gapWidth: 3 } },
              { itemStyle: { borderWidth: 2, gapWidth: 2 } },
            ],
            data: treeData,
          },
        ],
      };
    }

    async function loadKrHeatmap() {
      if (krHeatmapSectorsCache) {
        krHeatmapLoading.value = false;
        await nextTick();
        const el = krChartEl.value;
        if (!el) return;
        if (krChartInstance) krChartInstance.dispose();
        krChartInstance = echarts.init(el, "dark");
        krChartInstance.setOption(buildKrOption(krHeatmapSectorsCache));
        return;
      }

      krHeatmapLoading.value = true;
      krHeatmapError.value = "";
      try {
        const res = await axios.get("/api/stock/heatmap/kr");
        krUpdatedAt.value = res.data.updatedAt || "";
        krHeatmapSectorsCache = res.data.sectors;

        krHeatmapLoading.value = false;
        await nextTick();

        const el = krChartEl.value;
        if (!el) return;
        if (krChartInstance) krChartInstance.dispose();
        krChartInstance = echarts.init(el, "dark");
        krChartInstance.setOption(buildKrOption(res.data.sectors));
      } catch {
        krHeatmapError.value = "국내 히트맵 데이터를 불러올 수 없습니다.";
        krHeatmapLoading.value = false;
      }
    }

    function initHeatmap(market) {
      const container = document.querySelector("#tv-heatmap");
      if (!container) return;
      container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
      script.async = true;
      const isMobile = window.innerWidth <= 768;
      const tvHeight = isMobile
        ? Math.floor(window.innerHeight * 0.7).toString()
        : "560";

      script.textContent = JSON.stringify({
        exchanges: market === "nasdaq" ? ["NASDAQ"] : [],
        dataSource: market === "nasdaq" ? "NDX100" : "SPX500",
        grouping: isMobile ? "no_group" : "sector",
        blockSize: "market_cap_basic",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: "dark",
        hasTopBar: false,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: tvHeight,
      });
      container.appendChild(script);
    }

    function switchHeatmap(market) {
      heatmapMarket.value = market;
      if (market !== "kr" && krChartInstance) {
        krChartInstance.dispose();
        krChartInstance = null;
      }
      if (market !== "kr") {
        tvUpdatedAt.value = new Date().toLocaleString("ko-KR", {
          year: "numeric", month: "numeric", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      }
      nextTick(() => {
        if (market === "kr") loadKrHeatmap();
        else initHeatmap(market);
      });
    }

    function onResizeKrChart() {
      if (krChartInstance) krChartInstance.resize();
    }

    function onOrientationChange() {
      setTimeout(() => {
        if (krChartInstance) {
          krChartInstance.resize();
          if (heatmapMarket.value === "kr") loadKrHeatmap();
        }
      }, 300);
    }

    function activate() {
      if (heatmapMarket.value !== "kr") {
        tvUpdatedAt.value = new Date().toLocaleString("ko-KR", {
          year: "numeric", month: "numeric", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      }
      nextTick(() => {
        if (heatmapMarket.value === "kr") loadKrHeatmap();
        else initHeatmap(heatmapMarket.value);
      });
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive) {
          logAudit("STOCK/HEATMAP", "VIEW", `market=${heatmapMarket.value}`);
          activate();
        }
      },
    );

    onMounted(() => {
      window.addEventListener("resize", onResizeKrChart);
      window.addEventListener("orientationchange", onOrientationChange);
      if (props.active) {
        logAudit("STOCK/HEATMAP", "VIEW", `market=${heatmapMarket.value}`);
        activate();
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", onResizeKrChart);
      window.removeEventListener("orientationchange", onOrientationChange);
      if (krChartInstance) {
        krChartInstance.dispose();
        krChartInstance = null;
      }
    });

    return {
      heatmapMarket,
      krChartEl,
      krHeatmapLoading,
      krHeatmapError,
      krUpdatedAt,
      tvUpdatedAt,
      isUsMarketOpen,
      switchHeatmap,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
