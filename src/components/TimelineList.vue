<template>
  <div class="timeline">
    <div
      v-for="item in items"
      :key="item.id"
      :class="['timeline-item', item.category]"
      @click="$emit('select', item)"
    >
      <div class="timeline-date">
        {{ dateFormatter(item) }}
      </div>
      <div class="timeline-content">
        <div class="timeline-icon">
          <i :class="categoryIconGetter(item.category)"></i>
        </div>
        <div class="timeline-body">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <div
            v-if="item.processedMedia && item.processedMedia.length > 0"
            class="timeline-images"
          >
            <div class="image-gallery">
              <template
                v-for="media in item.processedMedia.slice(0, 3)"
                :key="media.originalIndex"
              >
                <div
                  class="media-thumbnail"
                  :class="{ 'has-video': media.isVideo }"
                >
                  <video
                    v-if="media.isVideo"
                    :src="media.url"
                    class="memory-image memory-video"
                    muted
                    loop
                    playsinline
                    autoplay
                    preload="metadata"
                  ></video>
                  <img
                    v-else
                    :src="media.url"
                    :alt="item.title"
                    class="memory-image"
                    @error="$emit('image-error', $event)"
                    @load="$emit('image-load', $event)"
                  />
                  <span
                    v-if="media.isVideo && media.originalIndex === item.firstVideoIndex"
                    class="video-overlay-indicator"
                  >
                    <i class="fas fa-play"></i>
                  </span>
                </div>
              </template>
              <div v-if="item.totalMediaCount > 3" class="more-media">
                +{{ item.totalMediaCount - 3 }}
              </div>
            </div>
            <div class="media-counts">
              <span
                v-if="item.imageCount"
                class="media-count-tag image"
              >
                이미지 {{ item.imageCount }}
              </span>
              <span
                v-if="item.videoCount"
                class="media-count-tag video"
              >
                동영상 {{ item.videoCount }}
              </span>
            </div>
          </div>
          <div class="timeline-footer">
            <span class="location" v-if="item.location">
              <i :class="locationIcon"></i>
              {{ item.location }}
            </span>
            <button
              v-if="canShowDelete(item)"
              class="btn btn-sm btn-danger delete-btn"
              type="button"
              @click.stop="$emit('delete', item)"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TimelineList",
  props: {
    items: {
      type: Array,
      required: true,
    },
    dateFormatter: {
      type: Function,
      required: true,
    },
    categoryIconGetter: {
      type: Function,
      required: true,
    },
    allowDelete: {
      type: [Boolean, Function],
      default: true,
    },
    locationIcon: {
      type: String,
      default: "fas fa-map-marker-alt",
    },
  },
  emits: ["select", "delete", "image-error", "image-load"],
  methods: {
    canShowDelete(item) {
      if (typeof this.allowDelete === "function") {
        return this.allowDelete(item);
      }
      return this.allowDelete;
    },
  },
};
</script>

<style src="@/assets/css/timeline.css"></style>

