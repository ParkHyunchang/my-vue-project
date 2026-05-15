<template>
  <teleport to="#modal">
    <Modal v-if="show" @close="$emit('close')">
      <template #header>
        <h3>{{ isEditing ? '구독 수정' : '새 구독 추가' }}</h3>
      </template>
      <template #body>
        <form @submit.prevent="$emit('save')" class="subscription-form">
          <div class="form-group">
            <label>서비스명</label>
            <input
              :value="modelValue.name"
              @input="updateField('name', $event.target.value)"
              type="text"
              class="form-control"
              placeholder="예: Netflix, Claude Pro, 쿠팡 와우"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>금액</label>
              <input
                :value="modelValue.amount"
                @input="updateField('amount', $event.target.value === '' ? null : Number($event.target.value))"
                type="number"
                class="form-control"
                min="0"
                required
              />
            </div>
            <div class="form-group">
              <label>통화</label>
              <select
                :value="modelValue.currency"
                @change="updateField('currency', $event.target.value)"
                class="form-control"
              >
                <option value="KRW">KRW (원)</option>
                <option value="USD">USD ($)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>결제 주기</label>
            <div class="segment-group">
              <button
                type="button"
                v-for="cycle in CYCLE_OPTIONS"
                :key="cycle.value"
                :class="['segment-btn', { active: modelValue.billingCycle === cycle.value }]"
                @click="updateField('billingCycle', cycle.value)"
              >
                {{ cycle.label }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>다음 결제일</label>
              <input
                :value="modelValue.nextBillingDate"
                @input="updateField('nextBillingDate', $event.target.value)"
                type="date"
                class="form-control"
                required
              />
            </div>
            <div class="form-group">
              <label>시작일 (선택)</label>
              <input
                :value="modelValue.startedAt"
                @input="updateField('startedAt', $event.target.value)"
                type="date"
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label>카테고리</label>
            <div class="category-grid">
              <button
                type="button"
                v-for="cat in CATEGORY_OPTIONS"
                :key="cat"
                :class="['category-option', { active: modelValue.category === cat }]"
                @click="updateField('category', cat)"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>결제 수단 (선택)</label>
              <input
                :value="modelValue.paymentMethod"
                @input="updateField('paymentMethod', $event.target.value)"
                type="text"
                class="form-control"
                placeholder="예: 신한카드, 페이팔"
              />
            </div>
            <div class="form-group">
              <label>상태</label>
              <select
                :value="modelValue.status"
                @change="updateField('status', $event.target.value)"
                class="form-control"
              >
                <option value="ACTIVE">활성</option>
                <option value="PAUSED">일시정지</option>
                <option value="CANCELED">해지됨</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>색상</label>
            <div class="color-grid">
              <button
                type="button"
                v-for="c in COLOR_OPTIONS"
                :key="c"
                :class="['color-dot', { active: modelValue.color === c }]"
                :style="{ background: c }"
                :aria-label="c"
                @click="updateField('color', c)"
              />
            </div>
          </div>

          <div class="form-group">
            <label>메모 (선택)</label>
            <textarea
              :value="modelValue.memo"
              @input="updateField('memo', $event.target.value)"
              class="form-control"
              rows="2"
              placeholder="기억해둘 내용이 있다면..."
            />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-footer-buttons">
          <button type="button" class="btn btn-primary" @click="$emit('save')">
            {{ isEditing ? '수정' : '저장' }}
          </button>
          <button
            v-if="isEditing"
            type="button"
            class="btn btn-danger"
            @click="$emit('delete', modelValue)"
          >
            삭제
          </button>
          <button type="button" class="btn btn-primary" @click="$emit('close')">
            취소
          </button>
        </div>
      </template>
    </Modal>
  </teleport>
</template>

<script>
import Modal from '@/components/Modal.vue';

export const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: '월간' },
  { value: 'YEARLY', label: '연간' },
  { value: 'WEEKLY', label: '주간' },
];

export const CATEGORY_OPTIONS = [
  // 디지털 콘텐츠
  'OTT/스트리밍', '음악', 'AI',
  // 생활/고정비
  '통신', '보험', '쇼핑 멤버십', '렌탈',
  // 자기계발
  '학습/교육', '도서/전자책', '운동/건강',
  '기타',
];

export const COLOR_OPTIONS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#64748b', '#0ea5e9',
];

export default {
  name: 'SubscriptionFormModal',
  components: { Modal },
  props: {
    show: { type: Boolean, required: true },
    isEditing: { type: Boolean, default: false },
    modelValue: { type: Object, required: true },
  },
  emits: ['close', 'save', 'delete', 'update:modelValue'],
  setup(props, { emit }) {
    const updateField = (key, value) => {
      emit('update:modelValue', { ...props.modelValue, [key]: value });
    };
    return { updateField, CYCLE_OPTIONS, CATEGORY_OPTIONS, COLOR_OPTIONS };
  },
};
</script>

<style src="@/assets/css/subscription.css" scoped></style>
