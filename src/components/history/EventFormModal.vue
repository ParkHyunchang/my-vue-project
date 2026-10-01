<template>
  <TimelineFormModal
    v-bind="$attrs"
    :memory="event"
    menu-path="/history"
    api-path="/api/histories"
    item-label="이벤트"
    delete-media-path="/api/histories/media"
    delete-media-param="mediaPath"
  />
</template>

<script>
import TimelineFormModal from "@/components/timeline/TimelineFormModal.vue";
export default {
  name: "EventFormModal",
  components: { TimelineFormModal },
  inheritAttrs: false,
  props: { event: { type: Object, default: null } },
};
</script>
