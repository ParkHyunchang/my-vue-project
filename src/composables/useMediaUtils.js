import axios from "@/axios";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm", "avi", "m4v", "3gp"];

export function useMediaUtils() {
  function getExtensionFromName(name = "") {
    if (!name) return "";
    const sanitized = name.split("?")[0];
    const segments = sanitized.split(".");
    if (segments.length < 2) return "";
    return segments.pop().toLowerCase();
  }

  function isImageFile(file) {
    if (!file) return false;
    const ext = getExtensionFromName(file.name);
    if (ext) return IMAGE_EXTENSIONS.includes(ext);
    return file.type && file.type.startsWith("image/");
  }

  function isVideoFile(file) {
    if (!file) return false;
    const ext = getExtensionFromName(file.name);
    if (ext) return VIDEO_EXTENSIONS.includes(ext);
    return file.type && file.type.startsWith("video/");
  }

  function extractPath(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (value.path) return value.path;
      if (value.url) return value.url;
    }
    return "";
  }

  function isVideoMedia(value) {
    const path = extractPath(value);
    if (!path) return false;
    return VIDEO_EXTENSIONS.includes(getExtensionFromName(path));
  }

  function getImageUrl(imagePath) {
    const path = extractPath(imagePath);
    if (!path || path.trim() === "") return "";
    if (path.startsWith("http")) return path;
    const baseURL = axios.defaults.baseURL;
    return `${baseURL}${path}`;
  }

  function parseImagesArray(memory) {
    if (memory.images && typeof memory.images === "string") {
      try { return JSON.parse(memory.images); } catch { return memory.image ? [memory.image] : []; }
    }
    if (Array.isArray(memory.images)) return memory.images;
    return memory.image ? [memory.image] : [];
  }

  return {
    getExtensionFromName,
    isImageFile,
    isVideoFile,
    extractPath,
    isVideoMedia,
    getImageUrl,
    parseImagesArray,
  };
}
