import axios from "@/axios";

const ENDPOINTS = {
  history: { records: "/api/histories", media: "/api/histories/media", param: "mediaPath" },
  dating: { records: "/api/dating", media: "/api/dating/image", param: "imagePath" },
};

// record retains the existing History/Dating request contract; media paths are not sent in it.
export function saveTimelineRecord(domain, record, editing) {
  const { records } = ENDPOINTS[domain];
  return editing ? axios.put(`${records}/${record.id}`, record) : axios.post(records, record);
}

export function deleteTimelineMedia(domain, path) {
  const { media, param } = ENDPOINTS[domain];
  return axios.delete(media, { params: { [param]: path } });
}
