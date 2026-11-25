// One delivery per active incident. State is intentionally memory-only, never broker data storage.
export function createTradingAlertDelivery() {
  const delivered = new Set();
  return {
    async sync(items, enabled, send) {
      const active = new Set(items.map(item => item.id));
      for (const id of delivered) if (!active.has(id)) delivered.delete(id);
      if (!enabled) return;
      for (const item of items) {
        if (!item.id || delivered.has(item.id)) continue;
        delivered.add(item.id); // Reserve before awaiting to avoid concurrent poll duplicates.
        try { await send(item); } catch (error) { delivered.delete(item.id); throw error; }
      }
    },
  };
}
