<template>
  <div>
    <div class="news-controls">
      <div class="news-market-toggle">
        <button
          :class="['news-market-btn', newsMarket === 'KR' && 'active']"
          @click="switchNewsMarket('KR')"
        >🇰🇷 국내</button>
        <button
          :class="['news-market-btn', newsMarket === 'US' && 'active']"
          @click="switchNewsMarket('US')"
        >🌐 해외</button>
        <div class="news-divider"></div>
        <button
          :class="['news-holdings-btn', newsFilterHoldings && 'active']"
          :disabled="holdings.length === 0"
          @click="newsFilterHoldings = !newsFilterHoldings"
        >
          📊 내 보유 종목
          <span v-if="newsFilterHoldings" class="news-match-count">{{ filteredNewsData.length }}</span>
        </button>
      </div>
      <div class="news-right-controls">
        <span v-if="newsLastFetchedText && !newsLoading" class="news-fetch-time">{{ newsLastFetchedText }}</span>
        <button class="news-refresh-btn" :disabled="newsLoading" title="뉴스 새로고침" @click="refreshNews">
          <span :class="['news-refresh-icon', newsLoading && 'spinning']">↻</span>
        </button>
      </div>
    </div>

    <div class="news-search-wrap">
      <span class="news-search-icon">🔍</span>
      <input
        v-model="newsKeyword"
        class="news-search-input"
        type="text"
        placeholder="제목·내용 검색..."
      />
      <button v-if="newsKeyword" class="news-search-clear" @click="newsKeyword = ''">✕</button>
    </div>

    <div v-if="newsLoading" class="loading-state">
      <div class="spinner"></div>
      <span>뉴스를 불러오는 중...</span>
    </div>

    <div v-else-if="newsError" class="error-state">
      <span>⚠️ {{ newsError }}</span>
      <button class="retry-btn" @click="loadNews(newsMarket)">다시 시도</button>
    </div>

    <template v-else>
      <div class="news-count-bar">
        총 <strong>{{ filteredNewsData.length }}</strong>건
        <span v-if="newsKeyword || newsFilterHoldings" class="news-count-filter">· 필터 적용 중</span>
      </div>
      <div v-if="filteredNewsData.length > 0" class="news-grid">
        <a
          v-for="(news, idx) in filteredNewsData"
          :key="idx"
          :href="news.link"
          target="_blank"
          rel="noopener noreferrer"
          :class="['news-card', visitedLinksSet.has(news.link) && 'news-card--visited', !news.imageUrl && 'news-card--no-image']"
          @click="markVisited(news.link)"
        >
          <img
            v-if="news.imageUrl"
            :src="news.imageUrl"
            class="news-img"
            alt=""
            loading="lazy"
            @error="(e) => e.target.style.display = 'none'"
          />
          <div class="news-meta">
            <span :class="['news-source', `news-source--${newsSourceKey(news.source)}`]">{{ news.source }}</span>
            <span class="news-date">{{ formatNewsDate(news.pubDate) }}</span>
          </div>
          <h4 class="news-title">{{ news.title }}</h4>
          <p v-if="news.description" class="news-desc">{{ news.description }}</p>
        </a>
      </div>
      <div v-else class="empty-state">
        {{ newsFilterHoldings && !newsKeyword ? '보유 종목 관련 뉴스가 없습니다.' : '검색 결과가 없습니다.' }}
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import axios from "@/axios";
import { logAudit } from "@/utils/audit";
import { useStockFormatters } from "@/composables/useStockFormatters";

export default {
  name: "NewsPanel",
  props: {
    active: { type: Boolean, default: false },
    holdings: { type: Array, default: () => [] },
  },
  setup(props) {
    const { formatNewsDate } = useStockFormatters();

    const newsData = ref([]);
    const newsLoading = ref(false);
    const newsError = ref("");
    const newsMarket = ref(localStorage.getItem("stock_newsMarket") || "KR");
    const newsFilterHoldings = ref(false);
    const newsKeyword = ref("");
    const newsLastFetched = ref(null);
    const usEnNames = ref({});

    const visitedLinksList = ref(JSON.parse(localStorage.getItem("stock_visited_links") || "[]"));
    const visitedLinksSet = computed(() => new Set(visitedLinksList.value));

    let newsTimer = null;

    async function loadNews(market = "KR", force = false) {
      newsLoading.value = true;
      newsError.value = "";
      try {
        const params = { market };
        if (force) params.force = true;
        const res = await axios.get("/api/stock/news", { params });
        newsData.value = res.data;
        newsLastFetched.value = new Date();
      } catch {
        newsError.value = "뉴스를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.";
      } finally {
        newsLoading.value = false;
      }
    }

    const filteredNewsData = computed(() => {
      let data = newsData.value;

      if (newsFilterHoldings.value && props.holdings.length > 0) {
        const keywords = props.holdings.flatMap((h) => {
          const terms = [];
          if (h.market === "KR") {
            terms.push(h.name.toLowerCase());
          } else {
            const ticker = h.symbol.replace(/\.(KS|KQ)$/i, "").toUpperCase();
            const enName = usEnNames.value[ticker];
            if (enName) {
              enName.split(" ").forEach((w) => { if (w.length >= 3) terms.push(w); });
            }
            const firstName = h.name.split(/[\s,.(]/)[0].toLowerCase();
            if (firstName.length >= 3) terms.push(firstName);
            if (ticker.length >= 2) terms.push(ticker.toLowerCase());
          }
          return terms;
        });
        data = data.filter((news) => {
          const text = [
            news.title || "", news.originalTitle || "",
            news.description || "", news.originalDescription || "",
          ].join(" ").toLowerCase();
          return keywords.some((kw) => kw.length >= 2 && text.includes(kw));
        });
      }

      const kw = newsKeyword.value.trim().toLowerCase();
      if (kw) {
        data = data.filter((news) => {
          const text = [
            news.title || "", news.originalTitle || "",
            news.description || "", news.originalDescription || "",
          ].join(" ").toLowerCase();
          return text.includes(kw);
        });
      }

      return data;
    });

    async function switchNewsMarket(market) {
      if (newsMarket.value === market) return;
      newsMarket.value = market;
      localStorage.setItem("stock_newsMarket", market);
      newsData.value = [];
      newsKeyword.value = "";
      newsFilterHoldings.value = false;
      await loadNews(market);
    }

    async function refreshNews() {
      newsData.value = [];
      await loadNews(newsMarket.value, true);
    }

    function newsSourceKey(source) {
      const map = {
        "한국경제": "hk", "머니투데이": "mt", "연합뉴스": "yn", "매일경제": "mk",
        "이데일리": "ed", "서울경제": "sd", "아시아경제": "ae",
        "Yahoo Finance": "yf", "MarketWatch": "mw", "CNBC": "cnbc",
        "AP News": "ap", "Motley Fool": "mf", "Investopedia": "iv",
      };
      return map[source] || "etc";
    }

    const newsLastFetchedText = computed(() => {
      if (!newsLastFetched.value) return "";
      return newsLastFetched.value.toLocaleTimeString("ko-KR", {
        hour: "2-digit", minute: "2-digit",
      }) + " 기준";
    });

    function markVisited(link) {
      if (visitedLinksSet.value.has(link)) return;
      const updated = [...visitedLinksList.value, link];
      visitedLinksList.value = updated.length > 500 ? updated.slice(-500) : updated;
      localStorage.setItem("stock_visited_links", JSON.stringify(visitedLinksList.value));
    }

    function startAutoRefresh() {
      if (newsTimer) return;
      newsTimer = setInterval(() => loadNews(newsMarket.value), 20 * 60 * 1000);
    }
    function stopAutoRefresh() {
      clearInterval(newsTimer);
      newsTimer = null;
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive) {
          logAudit("STOCK/NEWS", "VIEW", `market=${newsMarket.value}`);
          if (newsData.value.length === 0) loadNews(newsMarket.value);
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      },
    );

    onMounted(async () => {
      if (props.active) {
        logAudit("STOCK/NEWS", "VIEW", `market=${newsMarket.value}`);
        if (newsData.value.length === 0) loadNews(newsMarket.value);
        startAutoRefresh();
      }
      try {
        const res = await axios.get("/api/stock/en-names");
        if (res.data && typeof res.data === "object") {
          usEnNames.value = res.data;
        }
      } catch { /* noop */ }
    });

    onBeforeUnmount(() => {
      stopAutoRefresh();
    });

    return {
      newsData, newsLoading, newsError, newsMarket,
      newsFilterHoldings, newsKeyword, newsLastFetched,
      newsLastFetchedText, filteredNewsData,
      visitedLinksSet, markVisited,
      switchNewsMarket, refreshNews, newsSourceKey, loadNews,
      formatNewsDate,
    };
  },
};
</script>

<style src="@/assets/css/stock.css" scoped></style>
