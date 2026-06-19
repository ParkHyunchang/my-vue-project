<template>
  <section id="experience" class="experience-section">
    <div class="experience__inner">
      <h2 class="experience__title">Experience</h2>
      <div class="section-divider"></div>
      <span class="section-sub">Learning &amp; Growth</span>
      <div v-if="loading" class="home-section-state" role="status" aria-live="polite">
        경험 정보를 불러오는 중입니다...
      </div>
      <div v-else-if="error" class="home-section-state home-section-state--error" role="alert">
        <p>{{ error }}</p>
        <button type="button" class="home-section-retry" @click="$emit('retry')">다시 시도</button>
      </div>
      <div v-else-if="experiences.length === 0" class="home-section-state">
        등록된 경험이 없습니다.
      </div>
      <div v-else class="experience__timeline">
        <div v-for="item in experiences" :key="item.id" class="timeline__item">
          <div class="timeline__dot"></div>
          <div class="timeline__content">
            <h3>{{ item.title }}</h3>
            <p class="timeline__subtitle">{{ item.subtitle }}</p>
            <p class="timeline__desc">{{ item.description }}</p>
            <span class="timeline__period">{{ item.period }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ExperienceSection',
  props: {
    experiences: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['retry'],
};
</script>
