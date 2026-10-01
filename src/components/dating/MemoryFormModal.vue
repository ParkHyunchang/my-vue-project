<template>
  <TimelineFormModal
    v-bind="$attrs"
    menu-path="/dating"
    api-path="/api/dating"
    item-label="추억"
    delete-media-path="/api/dating/image"
    delete-media-param="imagePath"
  />
</template>

<script>
import TimelineFormModal from "@/components/timeline/TimelineFormModal.vue";
export default {
  name: "MemoryFormModal",
  components: { TimelineFormModal },
  inheritAttrs: false,
};
</script>
