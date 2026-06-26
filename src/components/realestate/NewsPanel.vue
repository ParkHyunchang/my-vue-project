<template>
  <div class="rn">
    <div class="rn-controls">
      <div class="rn-search-wrap">
        <span class="rn-search-icon">🔍</span>
        <input
          v-model="keyword"
          class="rn-search-input"
          type="text"
          placeholder="제목·내용 검색…"
        />
        <button v-if="keyword" class="rn-search-clear" @click="keyword = ''">✕</button>
      </div>
      <button class="rn-refresh" :disabled="loading" title="새로고침" @click="refresh">
        <span :class="['rn-refresh-icon', loading && 'spinning']">↻</span>
      </button>
    </div>

    <div v-if="loading" class="rn-empty">뉴스를 불러오는 중…</div>
    <div v-else-if="error" class="rn-empty">{{ error }}</div>

    <template v-else>
      <div class="rn-count">총 <strong>{{ filtered.length }}</strong>건</div>
      <div v-if="filtered.length" class="rn-grid">
        <a
          v-for="(n, i) in filtered"
          :key="i"
          :href="n.link"
          target="_blank"
          rel="noopener noreferrer"
          :class="['rn-card', !n.imageUrl && 'rn-card--no-image']"
        >
          <img
            v-if="n.imageUrl"
            :src="n.imageUrl"
            class="rn-img"
            alt=""
            loading="lazy"
            @error="(e) => (e.target.style.display = 'none')"
          />
          <div class="rn-meta">
            <span class="rn-source">{{ n.source }}</span>
            <span class="rn-date">{{ formatDate(n.pubDate) }}</span>
          </div>
          <h4 class="rn-title">{{ n.title }}</h4>
          <p v-if="n.description" class="rn-desc">{{ n.description }}</p>
        </a>
      </div>
      <div v-else class="rn-empty">검색 결과가 없습니다.</div>
    </template>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import axios from "@/axios";

export default {
  name: "RealEstateNewsPanel",
  props: { active: { type: Boolean, default: false } },
  setup(props) {
    const newsData = ref([]);
    const loading = ref(false);
    const error = ref("");
    const keyword = ref("");

    async function loadNews(force = false) {
      loading.value = true;
      error.value = "";
      try {
        const res = await axios.get("/api/realestate/news", {
          params: force ? { force: true } : {},
        });
        newsData.value = Array.isArray(res.data) ? res.data : [];
      } catch {
        error.value = "뉴스를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.";
      } finally {
        loading.value = false;
      }
    }

    function refresh() {
      loadNews(true);
    }

    const filtered = computed(() => {
      const kw = keyword.value.trim().toLowerCase();
      if (!kw) return newsData.value;
      return newsData.value.filter((n) =>
        [n.title || "", n.description || ""].join(" ").toLowerCase().includes(kw)
      );
    });

    function formatDate(pubDate) {
      if (!pubDate) return "";
      const d = new Date(pubDate);
      if (isNaN(d)) return pubDate;
      return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
    }

    watch(
      () => props.active,
      (isActive) => {
        if (isActive && newsData.value.length === 0) loadNews();
      }
    );
    onMounted(() => {
      if (props.active) loadNews();
    });

    return { newsData, loading, error, keyword, filtered, refresh, formatDate };
  },
};
</script>

<style src="@/assets/css/components/realestate/news-panel.css" scoped></style>
