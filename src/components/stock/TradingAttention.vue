<template>
  <section
    class="trading-attention"
    aria-label="운영 주의 알림"
  >
    <div class="attention-header">
      <strong>확인이 필요한 알림 <span v-if="items.length">{{ items.length }}건</span></strong>
      <button
        type="button"
        :disabled="requesting || !supported"
        @click="toggleNotifications"
      >
        {{ requesting ? '알림 권한 확인 중…' : enabled ? '기기 알림 끄기' : '기기 알림 켜기' }}
      </button>
    </div>
    <p class="notification-scope">
      화면 알림은 항상 표시됩니다. 기기 알림은 이 화면이 열려 있는 동안 선택한 시장의 새 경고만 전달합니다. 화면을 닫으면 감시하지 않습니다.
    </p>
    <p
      v-if="!supported || notificationError"
      role="status"
    >
      {{ notificationError || '이 브라우저는 기기 알림을 지원하지 않아 화면 안에서만 표시합니다.' }}
    </p>
    <ul
      v-if="items.length"
      aria-live="polite"
    >
      <li
        v-for="item in items"
        :key="item.id"
        :class="item.severity === 'critical' ? 'critical' : 'warning'"
      >
        <strong>{{ item.title }}</strong><p>{{ item.message }}</p>
      </li>
    </ul>
    <p
      v-else
      class="quiet"
    >
      현재 조회된 정보에서 추가 주의 알림이 없습니다. 운영 상태와 마지막 확인 시각을 함께 확인하세요.
    </p>
  </section>
</template>
<script setup>
/* global defineProps */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createTradingAlertDelivery } from '@/utils/tradingAlertDelivery';
const props = defineProps({ market: { type: String, required: true }, items: { type: Array, default: () => [] } });
const enabled = ref(false), requesting = ref(false), notificationError = ref('');
const supported = computed(() => typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator);
const delivery = createTradingAlertDelivery();
let registration = null, alive = true;
onBeforeUnmount(() => { alive = false; enabled.value = false; });
async function deliver() {
  try {
    await delivery.sync(props.items, enabled.value && alive, async () => {
      if (!alive || !enabled.value) return;
      if (Notification.permission !== 'granted' || !registration) throw new Error('Unavailable');
      await registration.showNotification('키움 자동매매 확인 필요', {
        body: `${props.market === 'US' ? '미국' : '국내'} 운영 화면에서 알림을 확인하세요.`,
        tag: `kiwoom-attention-${props.market}`,
      });
    });
  } catch {
    enabled.value = false;
    notificationError.value = '기기 알림을 표시하지 못했습니다. 화면 알림은 계속 표시됩니다.';
  }
}
async function toggleNotifications() {
  if (enabled.value) { enabled.value = false; return; }
  if (!supported.value || requesting.value) return;
  requesting.value = true; notificationError.value = '';
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (!alive) return;
    if (permission !== 'granted') {
      notificationError.value = '기기 알림 권한이 허용되지 않았습니다. 화면 알림은 계속 표시됩니다.';
      return;
    }
    registration = await navigator.serviceWorker.register('/trading-notifications-sw.js', { scope: '/trading-alerts/' });
    const worker = registration.installing || registration.waiting;
    if (!registration.active && worker) await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.removeEventListener('statechange', update);
        reject(new Error('Activation timeout'));
      }, 10000);
      const update = () => {
        if (worker.state === 'activated' || worker.state === 'redundant') {
          clearTimeout(timer); worker.removeEventListener('statechange', update);
          if (worker.state === 'activated') resolve(); else reject(new Error('Inactive worker'));
        }
      };
      worker.addEventListener('statechange', update); update();
    });
    if (!alive) return;
    enabled.value = true;
    await deliver();
  } catch {
    enabled.value = false;
    notificationError.value = '이 환경에서는 기기 알림을 켤 수 없습니다. 화면 알림을 이용해 주세요.';
  } finally { requesting.value = false; }
}
watch(() => props.items, deliver, { deep: true });
</script>
<style scoped>
.trading-attention { border: 1px solid var(--card-border); border-radius: var(--radius-card); padding: 16px; margin: 16px 0; background: var(--card-bg); }
.attention-header { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
button { min-height: 44px; padding: 10px 14px; background: var(--surface-2); border: 1px solid var(--card-border); color: var(--text-primary); border-radius: var(--radius-control); cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
p { color: var(--text-secondary); line-height: 1.6; font-size: 13px; margin: 8px 0 0; }
ul { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 10px; }
li { border-left: 3px solid var(--warning-color, #e6b66b); padding: 10px 12px; background: var(--surface-2); border-radius: 6px; overflow-wrap: anywhere; }
li.critical { border-color: var(--danger-color); }
li strong { color: var(--text-primary); }
.notification-scope,.quiet { font-size: 12px; }
@media (max-width: 480px) { .attention-header button { width: 100%; } }
</style>
