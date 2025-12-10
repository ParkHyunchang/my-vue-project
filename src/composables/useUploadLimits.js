const BYTES_IN_ONE_MB = 1024 * 1024;
const BYTES_IN_ONE_GB = 1024 * BYTES_IN_ONE_MB;
const DEFAULT_IMAGE_LIMIT_MB = 20;
const DEFAULT_VIDEO_LIMIT_MB = 200;
const DEFAULT_VIDEO_LIMIT_GB = DEFAULT_VIDEO_LIMIT_MB / 1024;

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const formatLimitLabel = (value, preferredUnit) => {
  if (preferredUnit === "GB" && value < 1) {
    return formatLimitLabel(value * 1024, "MB");
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    return `${value}${preferredUnit}`;
  }

  const rounded = Number.isInteger(normalized)
    ? normalized
    : Math.round(normalized * 100) / 100;

  return `${rounded}${preferredUnit}`;
};

export const useUploadLimits = () => {
  const imageLimitMb = parsePositiveNumber(
    process.env.VUE_APP_MAX_IMAGE_SIZE_MB,
    DEFAULT_IMAGE_LIMIT_MB
  );

  const videoLimitGb = parsePositiveNumber(
    process.env.VUE_APP_MAX_VIDEO_SIZE_GB,
    DEFAULT_VIDEO_LIMIT_GB
  );

  return {
    maxImageSizeBytes: imageLimitMb * BYTES_IN_ONE_MB,
    maxVideoSizeBytes: videoLimitGb * BYTES_IN_ONE_GB,
    maxImageLimitLabel: formatLimitLabel(imageLimitMb, "MB"),
    maxVideoLimitLabel: formatLimitLabel(videoLimitGb, "GB"),
  };
};

