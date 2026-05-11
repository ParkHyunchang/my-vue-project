<template>
  <section id="skill" class="career-section">
    <div class="career__inner">
      <h2 class="career__title">Career</h2>
      <div class="section-divider"></div>
      <span class="section-sub">Work History</span>
      <div class="career__list">
        <div v-for="item in careers" :key="item.id" class="career__item">
          <div class="career__header">
            <div class="career__icon">{{ item.icon }}</div>
            <div class="career__meta">
              <h3 class="career__company">{{ item.company }}</h3>
              <span class="career__period">{{ item.period }}</span>
            </div>
            <span v-if="item.badge" class="career__badge current">{{ item.badge }}</span>
          </div>
          <div class="career__body">
            <p class="career__role">{{ item.roleDesc }}</p>
            <ul class="career__projects">
              <li v-for="(proj, i) in parseJson(item.projects)" :key="i">{{ proj }}</li>
            </ul>
            <div class="career__tags">
              <span v-for="(tag, i) in parseJson(item.tags)" :key="i">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'CareerSection',
  props: {
    careers: { type: Array, required: true },
    parseJson: { type: Function, required: true },
  },
};
</script>
