<template>
  <div class="subscription-container">
    <div class="page-header">
      <h2>구독 관리</h2>
      <p class="page-subtitle">정기 결제 서비스를 한눈에 · 다음 결제일 임박 순으로 정렬</p>
    </div>

    <SubscriptionSummary
      :subscriptions="subscriptions"
      :format-currency="formatCurrency"
    />

    <div class="filter-toolbar">
      <div class="status-filters">
        <button
          v-for="opt in STATUS_FILTERS"
          :key="opt.value"
          :class="['filter-chip', { active: statusFilter === opt.value }]"
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
          <span class="filter-count">{{ countByStatus(opt.value) }}</span>
        </button>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + 새 구독 추가
      </button>
    </div>

    <div v-if="loading" class="loading">데이터를 불러오는 중...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    <SubscriptionCards
      v-else
      :subscriptions="visibleSubscriptions"
      :format-currency="formatCurrency"
      @edit="openEditModal"
    />

    <SubscriptionFormModal
      :show="showFormModal"
      :is-editing="isEditing"
      v-model="currentSubscription"
      @close="closeFormModal"
      @save="saveSubscription"
      @delete="openDeleteModal"
    />

    <teleport to="#modal">
      <DeleteModal
        v-if="showDeleteModal"
        :title="'구독 삭제'"
        :message="`'${subscriptionToDelete?.name ?? ''}' 구독을 정말 삭제하시겠습니까?`"
        @close="closeDeleteModal"
        @delete="deleteSubscription"
      />
    </teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import axios from '@/axios';
import DeleteModal from '@/components/DeleteModal.vue';
import SubscriptionSummary from '@/components/subscription/SubscriptionSummary.vue';
import SubscriptionCards from '@/components/subscription/SubscriptionCards.vue';
import SubscriptionFormModal from '@/components/subscription/SubscriptionFormModal.vue';
import { useToast } from '@/composables/toast';
import { logger } from '@/utils/logger';
import { apiErrorMessage } from '@/utils/apiError';

const STATUS_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'PAUSED', label: '일시정지' },
  { value: 'CANCELED', label: '해지됨' },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptySubscription() {
  return {
    id: undefined,
    name: '',
    amount: null,
    currency: 'KRW',
    billingCycle: 'MONTHLY',
    nextBillingDate: todayIso(),
    startedAt: '',
    category: 'OTT/스트리밍',
    paymentMethod: '',
    status: 'ACTIVE',
    color: '#3b82f6',
    memo: '',
  };
}

export default {
  name: 'SubscriptionPage',
  components: {
    DeleteModal,
    SubscriptionSummary,
    SubscriptionCards,
    SubscriptionFormModal,
  },
  setup() {
    const { showToast } = useToast();

    const subscriptions = ref([]);
    const loading = ref(false);
    const error = ref('');
    const statusFilter = ref('ALL');

    const showFormModal = ref(false);
    const isEditing = ref(false);
    const currentSubscription = ref(emptySubscription());

    const showDeleteModal = ref(false);
    const subscriptionToDelete = ref(null);

    const visibleSubscriptions = computed(() => {
      if (statusFilter.value === 'ALL') return subscriptions.value;
      return subscriptions.value.filter(s => (s.status || 'ACTIVE') === statusFilter.value);
    });

    const countByStatus = (status) => {
      if (status === 'ALL') return subscriptions.value.length;
      return subscriptions.value.filter(s => (s.status || 'ACTIVE') === status).length;
    };

    const fetchSubscriptions = async () => {
      loading.value = true;
      error.value = '';
      try {
        const res = await axios.get('/api/subscriptions');
        subscriptions.value = Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        logger.error('Error fetching subscriptions:', err);
        const msg = apiErrorMessage(err, '구독 목록을 불러오는데 실패했습니다.');
        error.value = msg;
        showToast(msg, 'danger');
      } finally {
        loading.value = false;
      }
    };

    const openCreateModal = () => {
      isEditing.value = false;
      currentSubscription.value = emptySubscription();
      showFormModal.value = true;
    };

    const openEditModal = (sub) => {
      isEditing.value = true;
      currentSubscription.value = {
        id: sub.id,
        name: sub.name ?? '',
        amount: sub.amount ?? null,
        currency: sub.currency ?? 'KRW',
        billingCycle: sub.billingCycle ?? 'MONTHLY',
        nextBillingDate: sub.nextBillingDate ?? todayIso(),
        startedAt: sub.startedAt ?? '',
        category: sub.category ?? '기타',
        paymentMethod: sub.paymentMethod ?? '',
        status: sub.status ?? 'ACTIVE',
        color: sub.color ?? '#3b82f6',
        memo: sub.memo ?? '',
      };
      showFormModal.value = true;
    };

    const closeFormModal = () => {
      showFormModal.value = false;
    };

    const saveSubscription = async () => {
      const s = currentSubscription.value;
      if (!s.name || !s.name.trim()) { showToast('서비스명을 입력해주세요.', 'danger'); return; }
      if (s.amount === null || s.amount === '' || Number.isNaN(Number(s.amount)) || Number(s.amount) < 0) {
        showToast('금액을 올바르게 입력해주세요.', 'danger');
        return;
      }
      if (!s.nextBillingDate) { showToast('다음 결제일을 입력해주세요.', 'danger'); return; }

      const payload = {
        ...s,
        amount: Number(s.amount),
        startedAt: s.startedAt || null,
        memo: s.memo || null,
        paymentMethod: s.paymentMethod || null,
      };

      try {
        if (isEditing.value && payload.id) {
          await axios.put(`/api/subscriptions/${payload.id}`, payload);
          showToast('구독이 수정되었습니다.', 'success');
        } else {
          await axios.post('/api/subscriptions', payload);
          showToast('구독이 추가되었습니다.', 'success');
        }
        closeFormModal();
        await fetchSubscriptions();
      } catch (err) {
        logger.error('Error saving subscription:', err);
        showToast(apiErrorMessage(err, '구독 저장에 실패했습니다.'), 'danger');
      }
    };

    const openDeleteModal = (sub) => {
      subscriptionToDelete.value = sub;
      showDeleteModal.value = true;
      showFormModal.value = false;
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      subscriptionToDelete.value = null;
    };

    const deleteSubscription = async () => {
      const target = subscriptionToDelete.value;
      if (!target?.id) return;
      try {
        await axios.delete(`/api/subscriptions/${target.id}`);
        showToast('구독이 삭제되었습니다.', 'success');
        closeDeleteModal();
        await fetchSubscriptions();
      } catch (err) {
        logger.error('Error deleting subscription:', err);
        showToast(apiErrorMessage(err, '구독 삭제에 실패했습니다.'), 'danger');
      }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(Math.round(amount || 0));

    onMounted(fetchSubscriptions);

    return {
      subscriptions, loading, error,
      statusFilter, visibleSubscriptions, countByStatus,
      showFormModal, isEditing, currentSubscription,
      showDeleteModal, subscriptionToDelete,
      openCreateModal, openEditModal, closeFormModal, saveSubscription,
      openDeleteModal, closeDeleteModal, deleteSubscription,
      formatCurrency,
      STATUS_FILTERS,
    };
  },
};
</script>

<style src="@/assets/css/subscription.css" scoped></style>
