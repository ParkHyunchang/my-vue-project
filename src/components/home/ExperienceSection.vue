<template>
  <section id="experience" class="experience-section">
    <div class="experience__inner">
      <h2 class="experience__title">Experience</h2>
      <div class="section-divider"></div>
      <span class="section-sub">Learning &amp; Growth</span>
      <div class="experience__timeline">
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
  },
};
</script>
