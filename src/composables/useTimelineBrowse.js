import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { recordYears, browseRecords } from '@/utils/timelineBrowse';

export function useTimelineBrowse(records, searchInput, category, media, categories) {
  const route = useRoute();
  const router = useRouter();
  const pagePath = route.path;
  const selectedYear = ref('');
  const sortOrder = ref('newest');
  let timer;
  const readQuery = () => {
    if (route.path !== pagePath) return;
    const q = route.query;
    searchInput.value = typeof q.q === 'string' ? q.q : '';
    category.value = categories.some(c => c.id === q.category) ? q.category : 'all';
    media.value = ['image', 'video'].includes(q.media) ? q.media : 'all';
    selectedYear.value = typeof q.year === 'string' && /^\d{4}$/.test(q.year) ? q.year : '';
    sortOrder.value = q.order === 'oldest' ? 'oldest' : 'newest';
  };
  watch(() => route.query, readQuery, { immediate: true });
  watch([searchInput, category, media, selectedYear, sortOrder], () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (route.path !== pagePath) return;
      const query = { ...route.query };
      // Keep spaces while typing; URL synchronization must not join separate words.
      const values = { q: searchInput.value, category: category.value === 'all' ? '' : category.value,
        media: media.value === 'all' ? '' : media.value, year: selectedYear.value, order: sortOrder.value === 'newest' ? '' : sortOrder.value };
      Object.entries(values).forEach(([key, value]) => { if (value) query[key] = value; else delete query[key]; });
      if (JSON.stringify(query) !== JSON.stringify(route.query)) router.replace({ query });
    }, 250);
  });
  onUnmounted(() => clearTimeout(timer));
  const resetFilters = () => {
    searchInput.value = ''; category.value = 'all'; media.value = 'all'; selectedYear.value = ''; sortOrder.value = 'newest';
  };
  return {
    selectedYear, sortOrder, resetFilters,
    availableYears: computed(() => recordYears(records.value)),
    hasFilters: computed(() => !!searchInput.value.trim() || category.value !== 'all' || media.value !== 'all' || !!selectedYear.value),
    arrange: items => browseRecords(items, selectedYear.value, sortOrder.value),
  };
}
