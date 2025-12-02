<template>
  <div class="timeline-filter">
    <div class="category-filter-row">
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        :class="['filter-btn', { active: selectedCategory === category.id }]"
        @click="$emit('select-category', category.id)"
      >
        <i v-if="category.icon" :class="category.icon"></i>
        {{ category.name }}
      </button>
    </div>
    <div
      v-if="mediaFilterOptions.length"
      class="media-filter-row"
    >
      <button
        v-for="option in mediaFilterOptions"
        :key="option.id"
        type="button"
        :class="['filter-btn', 'media-filter-btn', { active: mediaFilter === option.id }]"
        @click="$emit('select-media', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "TimelineFilter",
  props: {
    categories: {
      type: Array,
      required: true,
    },
    selectedCategory: {
      type: String,
      required: true,
    },
    mediaFilterOptions: {
      type: Array,
      default: () => [],
    },
    mediaFilter: {
      type: String,
      default: "all",
    },
  },
  emits: ["select-category", "select-media"],
};
</script>

<style src="@/assets/css/timeline.css"></style>

