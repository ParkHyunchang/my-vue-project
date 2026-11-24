// Recover only failed lazy-loaded assets, never authorization or application errors.
const MARKER_KEY = 'route-chunk-recovery';
export function isChunkLoadError(error) {
  return error?.name === 'ChunkLoadError' || error?.code === 'CSS_CHUNK_LOAD_FAILED'
    || /Loading (?:CSS )?chunk [\s\S]*failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error?.message || '');
}

export function createChunkLoadRecovery({ storage, isOnline, resolveHref, reload, notify }) {
  let latestTarget = null;
  let reloading = false;
  return {
    navigationStarted(fullPath) { latestTarget = fullPath; },
    navigationSucceeded(fullPath) {
      // The initial home route must not clear a retry for another destination.
      try {
        const marker = JSON.parse(storage().getItem(MARKER_KEY) || 'null');
        if (marker?.target === fullPath) storage().removeItem(MARKER_KEY);
      } catch { /* storage can be unavailable in private browsing */ }
    },
    handleError(error, fullPath) {
      if (!isChunkLoadError(error)) return false;
      if (fullPath !== latestTarget || reloading) return true;
      const explain = () => notify('화면 파일을 불러오지 못했습니다. 네트워크를 확인한 뒤 새로고침해 주세요.');
      if (!isOnline()) { explain(); return true; }
      try {
        const session = storage();
        if (session.getItem(MARKER_KEY)) { explain(); return true; }
        const href = resolveHref(fullPath);
        if (!href) { explain(); return true; }
        session.setItem(MARKER_KEY, JSON.stringify({ target: fullPath }));
        // Do not reload unless the loop guard was actually persisted.
        if (!session.getItem(MARKER_KEY)) { explain(); return true; }
        reloading = true;
        reload(href);
      } catch { explain(); }
      return true;
    },
  };
}
