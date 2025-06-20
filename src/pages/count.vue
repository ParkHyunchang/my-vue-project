<template>
  <div>카운트 페이지</div>
  <div>{{ count }}</div>
  <button @click="count++">Add</button>
</template>

<script>
import { useCount } from '@/composables/count';

export default {
  setup() {
    const { count } = useCount();
    return { count };
  }
}
</script>

<style></style> 