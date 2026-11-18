import { ref } from "vue";
import { saveTimelineRecord, deleteTimelineMedia } from "@/api/timelineApi";

export function useTimelineSave(domain) {
  const saving = ref(false);
  async function save(record, editing, removedMedia = []) {
    if (saving.value) return null;
    saving.value = true;
    try {
      // Never destroy files while the persisted record may still refer to them.
      const response = await saveTimelineRecord(domain, record, editing);
      const cleanup = await Promise.allSettled(
        [...new Set(removedMedia)].map((path) => deleteTimelineMedia(domain, path)),
      );
      return { record: response.data, cleanupFailed: cleanup.some((r) => r.status === "rejected") };
    } finally {
      saving.value = false;
    }
  }
  return { saving, save };
}
