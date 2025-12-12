<template>
  <div class="expense-container">
    <div class="page-header">
      <h2>가계부</h2>
    </div>

    <div class="summary-cards">
      <div class="summary-card income">
        <h3>총 수입</h3>
        <p class="amount">{{ formatCurrency(currentPeriodSummary.totalIncome) }}원</p>
      </div>
      <div class="summary-card expense">
        <h3>총 지출</h3>
        <p class="amount">{{ formatCurrency(currentPeriodSummary.totalExpense) }}원</p>
      </div>
      <div class="summary-card balance" :class="{ negative: currentPeriodSummary.balance < 0 }">
        <h3>잔액</h3>
        <p class="amount">{{ formatCurrency(currentPeriodSummary.balance) }}원</p>
      </div>
      <div class="summary-card fixed">
        <h3>고정 지출 합계</h3>
        <p class="amount">{{ formatCurrency(currentPeriodSummary.totalFixedExpense) }}원</p>
      </div>
    </div>

    <div class="filter-toolbar">
      <div class="period-section">
        <div class="period-buttons">
          <button
            :class="['period-button', { active: periodFilter === 'current-month' }]"
            @click="setPeriod('current-month')"
          >
            이번 달
          </button>
          <button
            :class="['period-button', { active: periodFilter === 'previous-month' }]"
            @click="setPeriod('previous-month')"
          >
            지난 달
          </button>
          <button
            :class="['period-button', { active: periodFilter === 'custom-month' }]"
            @click="setPeriod('custom-month')"
          >
            달 선택
          </button>
          <button
            :class="['period-button', { active: periodFilter === 'custom-range' }]"
            @click="setPeriod('custom-range')"
          >
            기간 선택
          </button>
          <button
            :class="['period-button', { active: periodFilter === 'all' }]"
            @click="setPeriod('all')"
          >
            전체
          </button>
        </div>

        <div v-if="periodFilter === 'custom-month'" class="period-inputs">
          <label class="period-label-text" for="periodMonth">조회할 달</label>
          <input
            id="periodMonth"
            type="month"
            v-model="selectedMonth"
            class="period-input"
          />
        </div>

        <div v-if="periodFilter === 'custom-range'" class="period-inputs range-inputs">
          <label class="period-label-text">조회 기간</label>
          <div class="range-fields">
            <input
              type="date"
              v-model="customStartDate"
              class="period-input"
            />
            <span class="range-separator">~</span>
            <input
              type="date"
              v-model="customEndDate"
              class="period-input"
            />
          </div>
        </div>

        <div v-if="periodLabel" class="period-label">
          {{ periodLabel }}
        </div>
        <div v-if="dateRangeError" class="period-error">
          {{ dateRangeError }}
        </div>
      </div>

      <div class="top-action-buttons">
        <button
          class="btn btn-primary"
          @click="importFixedExpenses"
          :disabled="isImportingFixed || fixedExpenses.length === 0 || !canImportToCurrentView"
          :title="canImportToCurrentView ? '' : '현재 선택한 기간에는 고정 지출을 일괄 추가할 수 없습니다.'"
        >
          <span v-if="isImportingFixed">추가 중...</span>
          <span v-else>{{ importButtonLabel }}</span>
        </button>
        <button class="btn btn-primary" @click="openCreateModal">
          + 새 항목 추가
        </button>
      </div>
    </div>

    <div class="fixed-section" :class="{ collapsed: fixedCollapsed }">
      <div class="section-header">
        <div class="section-header-left">
          <div>
            <h3>고정 지출 관리</h3>
            <p class="section-subtitle">
              매달 반복되는 지출을 별도로 기록하고 확인하세요.
            </p>
          </div>
        </div>
        <div class="section-actions">
          <div class="fixed-summary compact-summary">
            <span>총 {{ fixedExpenses.length }}건</span>
            <span>합계 {{ formatCurrency(fixedExpensesTotal) }}원</span>
          </div>
          <button
            type="button"
            class="collapse-toggle"
            @click="toggleFixedSection"
            :aria-expanded="!fixedCollapsed"
          >
            <span>{{ fixedCollapsed ? '열기' : '접기' }}</span>
            <span class="collapse-icon">{{ fixedCollapsed ? '＋' : '－' }}</span>
          </button>
          <button class="btn btn-secondary" @click="openCreateFixedModal">
            + 고정 지출 추가
          </button>
        </div>
      </div>
      <div v-if="fixedCollapsed" class="fixed-collapsed-summary">
        총 {{ fixedExpenses.length }}건 · 합계 {{ formatCurrency(fixedExpensesTotal) }}원
      </div>
      <div v-else>
        <div class="fixed-toolbar">
          <div class="fixed-summary">
            <span>총 {{ fixedExpenses.length }}건</span>
            <span>합계 {{ formatCurrency(fixedExpensesTotal) }}원</span>
          </div>
          <button
            class="btn btn-primary"
            @click="importFixedExpenses"
            :disabled="isImportingFixed || fixedExpenses.length === 0 || !canImportToCurrentView"
            :title="canImportToCurrentView ? '' : '현재 선택한 기간에는 고정 지출을 일괄 추가할 수 없습니다.'"
          >
            <span v-if="isImportingFixed">추가 중...</span>
            <span v-else>{{ importButtonLabel }}</span>
          </button>
        </div>
        <div v-if="fixedLoading" class="fixed-loading">
          고정 지출을 불러오는 중입니다...
        </div>
        <div v-else-if="fixedExpenses.length === 0" class="empty-state">
          등록된 고정 지출이 없습니다.
        </div>
        <div v-else class="fixed-list">
          <div
            v-for="expense in fixedExpenses"
            :key="expense.id"
            class="fixed-item"
          >
            <div class="fixed-item-main">
              <div class="fixed-item-title">
                <h4>{{ expense.title }}</h4>
                <span class="badge badge-fixed">고정</span>
              </div>
              <p v-if="expense.description" class="description">
                {{ expense.description }}
              </p>
              <div class="meta">
                <span class="category">{{ expense.category }}</span>
                <span class="date">{{ formatDate(expense.createdAt) }}</span>
              </div>
            </div>
            <div class="fixed-item-amount">
              - {{ formatCurrency(expense.amount) }}원
            </div>
            <div class="fixed-item-actions">
              <button @click="openEditModal(expense)" class="btn btn-sm btn-primary">
                수정
              </button>
              <button @click="openDeleteModal(expense)" class="btn btn-sm btn-danger">
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="view-mode-toggle">
      <button
        v-for="mode in viewModeOptions"
        :key="mode.value"
        :class="['toggle-btn', { active: viewMode === mode.value }]"
        @click="setViewMode(mode.value)"
      >
        {{ mode.label }}
      </button>
    </div>

    <div class="filters">
      <select v-model="selectedType" @change="onTypeFilterChange" class="filter-select">
        <option value="">전체 유형</option>
        <option value="INCOME">수입</option>
        <option value="EXPENSE">지출</option>
      </select>
      <select v-model="selectedCategory" @change="filterExpenses" class="filter-select">
        <option value="">전체 카테고리</option>
        <option
          v-for="category in categoryFilterOptions"
          :key="category"
          :value="category"
        >
          {{ category }}
        </option>
      </select>
      <select v-model="sortBy" @change="sortExpenses" class="filter-select">
        <option value="date-desc">최신순</option>
        <option value="date-asc">오래된순</option>
        <option value="amount-desc">금액 높은순</option>
        <option value="amount-asc">금액 낮은순</option>
        <option value="title-asc">제목 가나다순</option>
        <option value="title-desc">제목 역순</option>
      </select>
      <select v-model.number="itemsPerPage" @change="changeItemsPerPage" class="filter-select items-per-page-select">
        <option
          v-for="option in itemsPerPageOptions"
          :key="option"
          :value="option"
        >
          {{ option }}개씩 보기
        </option>
      </select>
    </div>

    <div v-if="loading" class="loading">
      데이터를 불러오는 중...
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="!loading && !error" class="expense-list">
      <div v-if="paginatedExpenses.length === 0" class="empty-state">
        가계부 항목이 없습니다.
      </div>
      <div
        v-else
        v-for="expense in paginatedExpenses"
        :key="expense.id"
        class="expense-item"
      >
        <div class="expense-info">
          <div class="expense-header">
            <h4>{{ expense.title }}</h4>
            <div class="expense-tags">
              <span
                class="badge"
                :class="expense.type === 'INCOME' ? 'badge-income' : 'badge-expense'"
              >
                {{ expense.type === 'INCOME' ? '수입' : '지출' }}
              </span>
              <span v-if="expense.fixed" class="badge badge-fixed">
                고정
              </span>
            </div>
          </div>
          <p v-if="expense.description" class="description">
            {{ expense.description }}
          </p>
          <div class="meta">
            <span class="category">{{ expense.category }}</span>
            <span class="date">{{ formatDate(expense.createdAt) }}</span>
          </div>
        </div>
        <div class="expense-amount" :class="expense.type.toLowerCase()">
          <span v-if="expense.type === 'INCOME'">+</span>
          <span v-else>-</span>
          {{ formatCurrency(expense.amount) }}원
        </div>
        <div class="expense-actions">
          <button @click="openEditModal(expense)" class="btn btn-sm btn-primary">수정</button>
          <button @click="openDeleteModal(expense)" class="btn btn-sm btn-danger">삭제</button>
        </div>
      </div>
    </div>

    <div
      v-if="!loading && !error && filteredExpenses.length > 0"
      class="pagination"
    >
      <div class="pagination-controls">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn nav-btn"
        >
          ← 이전
        </button>

        <div v-if="totalPages > 1" class="page-input-container">
          <span class="page-label">페이지</span>
          <input
            v-model.number="pageInput"
            @keyup.enter="goToInputPage"
            @blur="goToInputPage"
            type="number"
            :min="1"
            :max="totalPages"
            class="page-input"
            :class="{ error: pageInputError }"
          />
          <span class="page-total">/ {{ totalPages }}</span>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn nav-btn"
        >
          다음 →
        </button>
      </div>

      <div v-if="totalPages > 1" class="pagination-pages">
        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          :class="['pagination-btn page-btn', { active: page === currentPage }]"
          :disabled="page === '...'"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <div
      v-if="!loading && !error && filteredExpenses.length > 0"
      class="page-info"
    >
      {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredExpenses.length) }} / {{ filteredExpenses.length }}개 항목
    </div>

    <teleport to="#modal">
      <Modal v-if="showExpenseModal" @close="closeExpenseModal">
        <template #header>
          <h3>{{ isEditing ? '가계부 수정' : '새 항목 추가' }}</h3>
        </template>
        <template #body>
          <form @submit.prevent="saveExpense" class="expense-form">
            <div class="form-group">
              <label>내역</label>
              <input
                v-model="currentExpense.title"
                type="text"
                class="form-control"
                required
              />
            </div>
            <div class="form-group">
              <label>날짜</label>
              <input
                v-model="currentExpense.date"
                type="date"
                class="form-control"
                required
              />
              <span v-if="currentExpense.fixed" class="form-hint">
                고정 지출은 선택한 날짜 기준으로 매달 자동 등록됩니다.
              </span>
            </div>
            <div class="form-group">
              <label>금액</label>
              <input
                v-model.number="currentExpense.amount"
                type="number"
                class="form-control"
                required
                min="0"
              />
            </div>
            <div class="form-group">
              <label>유형</label>
              <select
                v-model="currentExpense.type"
                class="form-control"
                required
              >
                <option value="INCOME">수입</option>
                <option value="EXPENSE">지출</option>
              </select>
            </div>
            <div class="form-group category-group">
              <label>카테고리</label>
              <div class="category-grid">
                <button
                  type="button"
                  v-for="category in formCategoryOptions"
                  :key="category"
                  :class="['category-option', { active: currentExpense.category === category }]"
                  @click="currentExpense.category = category"
                >
                  {{ category }}
                </button>
              </div>
              <input type="hidden" :value="currentExpense.category" required>
            </div>
            <div
              v-if="currentExpense.type === 'EXPENSE'"
              class="form-group form-group-inline"
            >
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="currentExpense.fixed"
                />
                고정 지출 항목
              </label>
              <span class="form-hint">
                매달 반복되는 지출일 때 체크하세요.
              </span>
            </div>
          </form>
        </template>
        <template #footer>
          <div class="modal-footer-buttons">
            <button type="button" class="btn btn-primary" @click="saveExpense">
              {{ isEditing ? '수정' : '저장' }}
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="openDeleteModal(currentExpense)"
              v-if="isEditing"
            >
              삭제
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="closeExpenseModal"
            >
              취소
            </button>
          </div>
        </template>
      </Modal>
    </teleport>

    <teleport to="#modal">
      <DeleteModal
        v-if="showDeleteModal"
        :title="'가계부 항목 삭제'"
        :message="'이 항목을 정말 삭제하시겠습니까?'"
        @close="closeDeleteModal"
        @delete="deleteExpense"
      />
    </teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import Modal from '@/components/Modal.vue';
import DeleteModal from '@/components/DeleteModal.vue';
import { useToast } from '@/composables/toast';
import axios from '@/axios';

const formatMonthValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const buildMonthRange = (year, month) => {
  const monthString = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const dayString = String(lastDay).padStart(2, '0');
  return {
    startDate: `${year}-${monthString}-01T00:00:00`,
    endDate: `${year}-${monthString}-${dayString}T23:59:59`
  };
};

const formatDateInputValue = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildCreatedAtForImport = (expense, targetDate) => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  let day = 1;

  if (expense.createdAt) {
    const sourceDate = new Date(expense.createdAt);
    if (!Number.isNaN(sourceDate.getTime())) {
      day = sourceDate.getDate();
    }
  }

  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  const monthString = String(month + 1).padStart(2, '0');
  const dayString = String(safeDay).padStart(2, '0');
  return `${year}-${monthString}-${dayString}T00:00:00`;
};

const formatDateTimeForBoundary = (dateString, boundary) => {
  if (!dateString) {
    return null;
  }
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    return null;
  }
  const [year, month, day] = parts;
  const time = boundary === 'start' ? '00:00:00' : '23:59:59';
  return `${year}-${month}-${day}T${time}`;
};

const monthLabel = (value) => {
  if (!value) {
    return '';
  }
  const [year, month] = value.split('-');
  if (!year || !month) {
    return '';
  }
  return `${year}년 ${Number(month)}월`;
};

const dateLabel = (value) => {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return '';
  }
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

export default {
  components: {
    Modal,
    DeleteModal,
  },
  setup() {
    const { showToast } = useToast();

    const expenses = ref([]);
    const fixedExpenses = ref([]);
    const fixedCollapsed = ref(true);
    const isImportingFixed = ref(false);
    const summary = ref({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      totalFixedExpense: 0
    });
    const loading = ref(false);
    const fixedLoading = ref(false);
    const error = ref('');

    const showExpenseModal = ref(false);
    const isEditing = ref(false);
    const showDeleteModal = ref(false);

    const selectedType = ref('');
    const selectedCategory = ref('');
    const sortBy = ref('date-desc');
    const viewMode = ref('all');

    const viewModeOptions = [
      { value: 'all', label: '전체 내역' },
      { value: 'variable', label: '변동 지출만' },
      { value: 'fixed', label: '고정 지출만' }
    ];

    const currentPage = ref(1);
    const defaultItemsPerPage = typeof window !== 'undefined' && window.innerWidth <= 768 ? 5 : 10;
    const itemsPerPage = ref(defaultItemsPerPage);
    const itemsPerPageOptions = [5, 10, 20];
    const pageInput = ref(1);
    const pageInputError = ref(false);

    const expenseToDelete = ref(null);

    const incomeCategories = [
      '급여',
      '보너스',
      '현금',
      '투자',
      '기타'
    ];
    const expenseCategories = [
      '식비',
      '교통비',
      '주거비',
      '문화생활',
      '의료비',
      '교육',
      '세금',
      '보험료',
      '여행',
      '기타'
    ];

    const currentExpense = ref({
      id: undefined,
      title: '',
      amount: null,
      category: expenseCategories[0],
      type: 'EXPENSE',
      fixed: false,
      date: formatDateInputValue(new Date()),
      description: ''
    });

    const periodFilter = ref('current-month');
    const selectedMonth = ref(formatMonthValue(new Date()));
    const customStartDate = ref('');
    const customEndDate = ref('');
    const dateRangeError = ref('');
    const totalRecords = ref(0);

    const canImportToCurrentView = computed(() => ['current-month', 'previous-month'].includes(periodFilter.value));

    const importButtonLabel = computed(() => {
      if (!canImportToCurrentView.value) {
        return '선택된 기간에 추가할 수 없습니다';
      }
      return periodFilter.value === 'previous-month'
        ? '지난 달에 고정 지출 추가'
        : '이번 달에 고정 지출 추가';
    });

    const categoryFilterOptions = computed(() => {
      if (selectedType.value === 'INCOME') {
        return incomeCategories;
      }
      if (selectedType.value === 'EXPENSE') {
        return expenseCategories;
      }
      return Array.from(new Set([...incomeCategories, ...expenseCategories]));
    });

    const formCategoryOptions = computed(() => {
      return currentExpense.value.type === 'INCOME'
        ? incomeCategories
        : expenseCategories;
    });

    const fixedExpensesForPeriod = computed(() =>
      expenses.value.filter(expense => expense.fixed)
    );

    const baseExpenses = computed(() => {
      if (viewMode.value === 'fixed') {
        return fixedExpenses.value;
      }
      if (viewMode.value === 'variable') {
        return expenses.value.filter(expense => !expense.fixed);
      }
      return expenses.value;
    });

    const sortExpensesList = (list) => {
      const sorted = [...list];
      switch (sortBy.value) {
        case 'date-desc':
          return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'date-asc':
          return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'amount-desc':
          return sorted.sort((a, b) => b.amount - a.amount);
        case 'amount-asc':
          return sorted.sort((a, b) => a.amount - b.amount);
        case 'title-asc':
          return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
          return sorted.sort((a, b) => b.title.localeCompare(a.title));
        default:
          return sorted;
      }
    };

    const filteredExpenses = computed(() => {
      let filtered = baseExpenses.value.slice();

      if (selectedType.value) {
        filtered = filtered.filter(expense => expense.type === selectedType.value);
      }

      if (selectedCategory.value) {
        filtered = filtered.filter(expense => expense.category === selectedCategory.value);
      }

      return sortExpensesList(filtered);
    });

    const totalPages = computed(() => {
      const pages = Math.ceil(filteredExpenses.value.length / itemsPerPage.value);
      return pages > 0 ? pages : 1;
    });

    const paginatedExpenses = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return filteredExpenses.value.slice(start, end);
    });

    const visiblePages = computed(() => {
      const pages = [];
      const total = totalPages.value;
      const current = currentPage.value;

      if (total <= 7) {
        for (let i = 1; i <= total; i += 1) {
          pages.push(i);
        }
        return pages;
      }

      if (current <= 4) {
        for (let i = 1; i <= 5; i += 1) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
        return pages;
      }

      if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i += 1) {
          pages.push(i);
        }
        return pages;
      }

      pages.push(1);
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i += 1) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
      return pages;
    });

    const periodLabel = computed(() => {
      switch (periodFilter.value) {
        case 'all':
          return '전체 기간';
        case 'current-month':
          return `${monthLabel(selectedMonth.value)} (이번 달)`;
        case 'previous-month':
          return `${monthLabel(selectedMonth.value)} (지난 달)`;
        case 'custom-month':
          return selectedMonth.value ? monthLabel(selectedMonth.value) : '조회할 달을 선택하세요';
        case 'custom-range':
          if (customStartDate.value && customEndDate.value) {
            return `${dateLabel(customStartDate.value)} ~ ${dateLabel(customEndDate.value)}`;
          }
          return '조회할 기간을 선택하세요';
        default:
          return '';
      }
    });

    const fixedExpensesTotal = computed(() =>
      fixedExpenses.value.reduce((acc, item) => acc + (item.amount || 0), 0)
    );

    const currentPeriodSummary = computed(() => ({
      totalIncome: summary.value.totalIncome || 0,
      totalExpense: summary.value.totalExpense || 0,
      balance: summary.value.balance || 0,
      totalFixedExpense: summary.value.totalFixedExpense || 0
    }));

    const getPeriodRange = () => {
      if (periodFilter.value === 'all') {
        return null;
      }

      if (['current-month', 'previous-month', 'custom-month'].includes(periodFilter.value)) {
        if (!selectedMonth.value) {
          return null;
        }
        const [yearStr, monthStr] = selectedMonth.value.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        if (!year || !month) {
          return null;
        }
        return buildMonthRange(year, month);
      }

      if (periodFilter.value === 'custom-range') {
        if (!customStartDate.value || !customEndDate.value) {
          return null;
        }
        return {
          startDate: formatDateTimeForBoundary(customStartDate.value, 'start'),
          endDate: formatDateTimeForBoundary(customEndDate.value, 'end')
        };
      }

      return null;
    };

    const fetchExpenses = async (range) => {
      loading.value = true;
      error.value = '';
      try {
        let response;

        if (range && range.startDate && range.endDate) {
          response = await axios.get('/expenses/date-range', {
            params: {
              startDate: range.startDate,
              endDate: range.endDate
            }
          });
          totalRecords.value = Array.isArray(response.data) ? response.data.length : 0;
        } else {
          response = await axios.get('/expenses', {
            params: {
              page: 0,
              size: 500
            }
          });
          const headerTotal = Number(response.headers?.['x-total-count']);
          totalRecords.value = Number.isNaN(headerTotal) ? response.data.length : headerTotal;
        }

        expenses.value = Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching expenses:', err);
        error.value = '가계부 데이터를 불러오는데 실패했습니다.';
        showToast('가계부 데이터를 불러오는데 실패했습니다.', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const fetchSummary = async (range) => {
      try {
        let response;
        if (range && range.startDate && range.endDate) {
          response = await axios.get('/expenses/summary/date-range', {
            params: {
              startDate: range.startDate,
              endDate: range.endDate
            }
          });
        } else {
          response = await axios.get('/expenses/summary');
        }
        summary.value = {
          totalIncome: response.data?.totalIncome ?? 0,
          totalExpense: response.data?.totalExpense ?? 0,
          balance: response.data?.balance ?? 0,
          totalFixedExpense: response.data?.totalFixedExpense ?? 0
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching summary:', err);
      }
    };

    const fetchFixedExpenses = async () => {
      fixedLoading.value = true;
      try {
        const response = await axios.get('/expenses/fixed');
        fixedExpenses.value = Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching fixed expenses:', err);
      } finally {
        fixedLoading.value = false;
      }
    };

    const loadExpensesForCurrentPeriod = async () => {
      const range = getPeriodRange();
      await Promise.all([fetchExpenses(range), fetchSummary(range)]);
      currentPage.value = 1;
      pageInput.value = 1;
      pageInputError.value = false;
    };

    const resetForm = () => {
      currentExpense.value = {
        id: undefined,
        title: '',
        amount: null,
        category: expenseCategories[0],
        type: 'EXPENSE',
        fixed: false,
        date: formatDateInputValue(new Date()),
        description: ''
      };
    };

    const computeDefaultDateForCurrentPeriod = () => {
      if (periodFilter.value === 'previous-month') {
        const previous = new Date();
        previous.setMonth(previous.getMonth() - 1);
        return formatDateInputValue(previous);
      }
      if (periodFilter.value === 'custom-month' && selectedMonth.value) {
        const [year, month] = selectedMonth.value.split('-');
        if (year && month) {
          return `${year}-${month}-01`;
        }
      }
      if (periodFilter.value === 'custom-range' && customStartDate.value) {
        return customStartDate.value;
      }
      return formatDateInputValue(new Date());
    };

    const openCreateModal = () => {
      isEditing.value = false;
      resetForm();
      currentExpense.value.date = computeDefaultDateForCurrentPeriod();
      showExpenseModal.value = true;
    };

    const openCreateFixedModal = () => {
      isEditing.value = false;
      resetForm();
      currentExpense.value.type = 'EXPENSE';
      currentExpense.value.fixed = true;
      currentExpense.value.category = '주거비';
      currentExpense.value.date = computeDefaultDateForCurrentPeriod();
      showExpenseModal.value = true;
    };

    const toggleFixedSection = () => {
      fixedCollapsed.value = !fixedCollapsed.value;
    };

    const importFixedExpenses = async () => {
      if (fixedExpenses.value.length === 0 || isImportingFixed.value) {
        return;
      }

      if (!canImportToCurrentView.value) {
        showToast('현재 선택한 기간에는 고정 지출을 일괄 추가할 수 없습니다.', 'warning');
        return;
      }

      isImportingFixed.value = true;
      showToast('고정 지출을 추가하고 있습니다...', 'info');

      const targetDate = new Date();
      if (periodFilter.value === 'previous-month') {
        targetDate.setMonth(targetDate.getMonth() - 1);
      }
      targetDate.setDate(1);
      targetDate.setHours(0, 0, 0, 0);

      const successMessage = periodFilter.value === 'previous-month'
        ? '지난 달에 고정 지출 항목을 추가했습니다.'
        : '이번 달에 고정 지출 항목을 추가했습니다.';

      try {
        const payloads = fixedExpenses.value.map((expense) => ({
          title: expense.title,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          type: 'EXPENSE',
          fixed: false,
          createdAt: buildCreatedAtForImport(expense, targetDate)
        }));

        await Promise.all(payloads.map((payload) => axios.post('/expenses', payload)));
        await loadExpensesForCurrentPeriod();
        showToast(successMessage, 'success');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error importing fixed expenses:', err);
        showToast('고정 지출 항목 추가에 실패했습니다.', 'danger');
      } finally {
        isImportingFixed.value = false;
      }
    };

    const openEditModal = (expense) => {
      isEditing.value = true;
      currentExpense.value = {
        id: expense.id,
        title: expense.title,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        type: expense.type,
        fixed: !!expense.fixed,
        date: formatDateInputValue(expense.createdAt)
      };
      showExpenseModal.value = true;
    };

    const closeExpenseModal = () => {
      showExpenseModal.value = false;
      resetForm();
    };

    const saveExpense = async () => {
      const { date, ...rest } = currentExpense.value;
      const payload = {
        ...rest,
        amount: Number(currentExpense.value.amount)
      };

      if (Number.isNaN(payload.amount)) {
        showToast('금액을 확인해주세요.', 'danger');
        return;
      }

      if (date) {
        payload.createdAt = `${date}T00:00:00`;
      }

      try {
        if (isEditing.value) {
          await axios.put(`/expenses/${payload.id}`, payload);
          showToast('가계부 항목이 수정되었습니다.', 'success');
        } else {
          await axios.post('/expenses', payload);
          showToast('가계부 항목이 추가되었습니다.', 'success');
        }

        closeExpenseModal();
        await loadExpensesForCurrentPeriod();
        await fetchFixedExpenses();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error saving expense:', err);
        showToast('가계부 항목 저장에 실패했습니다.', 'danger');
      }
    };

    const openDeleteModal = (expense) => {
      expenseToDelete.value = expense;
      showDeleteModal.value = true;
    };

    const closeDeleteModal = () => {
      showDeleteModal.value = false;
      expenseToDelete.value = null;
    };

    const deleteExpense = async () => {
      if (!expenseToDelete.value?.id) {
        return;
      }

      try {
        await axios.delete(`/expenses/${expenseToDelete.value.id}`);
        showToast('가계부 항목이 삭제되었습니다.', 'success');
        closeDeleteModal();
        await loadExpensesForCurrentPeriod();
        await fetchFixedExpenses();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error deleting expense:', err);
        showToast('가계부 항목 삭제에 실패했습니다.', 'danger');
      }
    };

    const filterExpenses = () => {
      currentPage.value = 1;
      pageInput.value = 1;
      pageInputError.value = false;
    };

    const onTypeFilterChange = () => {
      if (selectedType.value === 'INCOME' && selectedCategory.value && !incomeCategories.includes(selectedCategory.value)) {
        selectedCategory.value = '';
      } else if (selectedType.value === 'EXPENSE' && selectedCategory.value && !expenseCategories.includes(selectedCategory.value)) {
        selectedCategory.value = '';
      }
      filterExpenses();
    };

    const sortExpenses = () => {
      currentPage.value = 1;
      pageInput.value = 1;
      pageInputError.value = false;
    };

    const changeItemsPerPage = () => {
      currentPage.value = 1;
      pageInput.value = 1;
      pageInputError.value = false;
    };

    const setViewMode = (mode) => {
      viewMode.value = mode;
      currentPage.value = 1;
      pageInput.value = 1;
      pageInputError.value = false;
    };

    const setPeriod = async (value) => {
      periodFilter.value = value;
      dateRangeError.value = '';

      if (value === 'all') {
        selectedMonth.value = '';
        customStartDate.value = '';
        customEndDate.value = '';
        await loadExpensesForCurrentPeriod();
        return;
      }

      if (value === 'current-month') {
        selectedMonth.value = formatMonthValue(new Date());
        await loadExpensesForCurrentPeriod();
        return;
      }

      if (value === 'previous-month') {
        const base = new Date();
        base.setMonth(base.getMonth() - 1);
        selectedMonth.value = formatMonthValue(base);
        await loadExpensesForCurrentPeriod();
        return;
      }

      if (value === 'custom-month') {
        if (!selectedMonth.value) {
          selectedMonth.value = formatMonthValue(new Date());
        }
        await loadExpensesForCurrentPeriod();
        return;
      }

      if (value === 'custom-range') {
        if (customStartDate.value && customEndDate.value) {
          if (new Date(customStartDate.value) > new Date(customEndDate.value)) {
            dateRangeError.value = '시작일이 종료일보다 이후입니다.';
            return;
          }
          await loadExpensesForCurrentPeriod();
        }
      }
    };

    watch(() => currentExpense.value.type, (type) => {
      const options = type === 'INCOME' ? incomeCategories : expenseCategories;
      if (!options.includes(currentExpense.value.category)) {
        currentExpense.value.category = options[0];
      }
      if (type === 'INCOME') {
        currentExpense.value.fixed = false;
      }
    });

    watch(selectedMonth, async (value, oldValue) => {
      if (periodFilter.value === 'custom-month' && value && value !== oldValue) {
        await loadExpensesForCurrentPeriod();
      }
    });

    watch([customStartDate, customEndDate], async ([start, end]) => {
      if (periodFilter.value !== 'custom-range') {
        return;
      }
      if (!start || !end) {
        dateRangeError.value = '';
        return;
      }
      if (new Date(start) > new Date(end)) {
        dateRangeError.value = '시작일이 종료일보다 이후입니다.';
        return;
      }
      dateRangeError.value = '';
      await loadExpensesForCurrentPeriod();
    });

    watch(viewMode, () => {
      currentPage.value = 1;
      pageInput.value = 1;
      pageInputError.value = false;
    });

    onMounted(async () => {
      await loadExpensesForCurrentPeriod();
      await fetchFixedExpenses();
    });

    const goToPage = (page) => {
      if (typeof page !== 'number') {
        return;
      }
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        pageInput.value = page;
        pageInputError.value = false;
      }
    };

    const goToInputPage = () => {
      const inputPage = parseInt(pageInput.value, 10);

      if (Number.isNaN(inputPage) || inputPage < 1 || inputPage > totalPages.value) {
        pageInputError.value = true;
        pageInput.value = currentPage.value;
        return;
      }

      pageInputError.value = false;
      currentPage.value = inputPage;
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('ko-KR').format(amount || 0);
    };

    const formatDate = (dateString) => {
      if (!dateString) {
        return '';
      }
      return new Date(dateString).toLocaleDateString('ko-KR');
    };

    return {
      expenses,
      summary,
      fixedExpenses,
      fixedExpensesForPeriod,
      fixedCollapsed,
      isImportingFixed,
      canImportToCurrentView,
      importButtonLabel,
      currentPeriodSummary,
      fixedExpensesTotal,
      showExpenseModal,
      isEditing,
      selectedType,
      selectedCategory,
      sortBy,
      viewMode,
      viewModeOptions,
      periodFilter,
      selectedMonth,
      customStartDate,
      customEndDate,
      dateRangeError,
      currentPage,
      itemsPerPage,
      itemsPerPageOptions,
      pageInput,
      pageInputError,
      showDeleteModal,
      currentExpense,
      loading,
      fixedLoading,
      error,
      filteredExpenses,
      paginatedExpenses,
      totalPages,
      visiblePages,
      periodLabel,
      openCreateModal,
      openCreateFixedModal,
      openEditModal,
      closeExpenseModal,
      saveExpense,
      openDeleteModal,
      closeDeleteModal,
      deleteExpense,
      filterExpenses,
      sortExpenses,
      toggleFixedSection,
      importFixedExpenses,
      changeItemsPerPage,
      setPeriod,
      setViewMode,
      goToPage,
      goToInputPage,
      formatCurrency,
      formatDate,
      onTypeFilterChange,
      categoryFilterOptions,
      formCategoryOptions
    };
  }
};
</script>

<style scoped>
.expense-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.filter-toolbar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 30px 0;
}

.top-action-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.top-action-buttons .btn {
  min-width: 160px;
}

.period-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 0;
}

.period-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
}

.period-button {
  padding: 10px 18px;
  border: 1px solid #d0d7ff;
  background: #ffffff;
  border-radius: 999px;
  color: #3b4cc0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  min-width: 110px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(59, 76, 192, 0.1);
}

.period-button:hover {
  background: #eef1ff;
  border-color: #3b4cc0;
}

.period-button.active {
  background: #3b4cc0;
  color: #fff;
  border-color: #3b4cc0;
  box-shadow: 0 3px 6px rgba(59, 76, 192, 0.3);
}

.period-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.period-input {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.period-label-text {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.period-label {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.period-error {
  font-size: 13px;
  color: #dc3545;
}

.range-inputs {
  flex-direction: column;
  align-items: flex-start;
}

.range-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-separator {
  color: #666;
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
}

.summary-card.income {
  border-left-color: #28a745;
}

.summary-card.expense {
  border-left-color: #dc3545;
}

.summary-card.balance {
  border-left-color: #007bff;
}

.summary-card.balance.negative {
  border-left-color: #dc3545;
}

.summary-card.fixed {
  border-left-color: #6f42c1;
}

.summary-card h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #666;
}

.summary-card .amount {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.fixed-section {
  background: #f9fbff;
  border: 1px solid #e3e8ff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  transition: all 0.3s ease;
}

.section-header {
  display: flex;
  align-items: center;
.collapse-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid #d0d7ff;
  background: #fff;
  color: #4b5fd4;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapse-toggle:hover {
  background: #EEF1FF;
}

.collapse-icon {
  font-size: 16px;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fixed-collapsed-summary {
  margin-top: 15px;
  padding: 12px 15px;
  border-radius: 10px;
  background: rgba(224, 231, 255, 0.6);
  color: #3b4cc0;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
}

.fixed-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.compact-summary {
  display: none;
}

  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.section-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

.fixed-loading {
  text-align: center;
  padding: 20px 0;
  color: #666;
}

.fixed-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #555;
  margin-bottom: 15px;
}

.fixed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fixed-item {
  background: white;
  border: 1px solid #e5e8f0;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.fixed-item-main {
  flex: 1;
}

.fixed-item-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.fixed-item-title h4 {
  margin: 0;
  color: #333;
}

.fixed-item .description {
  margin: 0 0 8px;
  font-size: 14px;
  color: #666;
}

.fixed-item-main .meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #888;
}

.fixed-item-amount {
  font-weight: 600;
  color: #dc3545;
  min-width: 120px;
  text-align: right;
}

.fixed-item-actions {
  display: flex;
  gap: 8px;
}

.fixed-section.collapsed .fixed-list,
.fixed-section.collapsed .fixed-toolbar {
  display: none;
}

.fixed-section.collapsed .section-subtitle {
  display: none;
}

.view-mode-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.toggle-btn {
  padding: 8px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #f0f5ff;
  border-color: #007bff;
}

.toggle-btn.active {
  background: #007bff;
  color: #fff;
  border-color: #007bff;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background: white;
  min-width: 150px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.expense-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.expense-item {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expense-info {
  flex: 1;
}

.expense-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.expense-info h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.expense-tags {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.expense-info .description {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.expense-info .meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-income {
  background: rgba(40, 167, 69, 0.12);
  color: #1e7e34;
}

.badge-expense {
  background: rgba(220, 53, 69, 0.12);
  color: #b21f2d;
}

.badge-fixed {
  background: rgba(111, 66, 193, 0.12);
  color: #6f42c1;
}

.expense-amount {
  font-size: 18px;
  font-weight: bold;
  margin: 0 20px;
}

.expense-amount.income {
  color: #28a745;
}

.expense-amount.expense {
  color: #dc3545;
}

.expense-actions {
  display: flex;
  gap: 10px;
}

/* 페이지네이션 스타일 */
.pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin: 30px 0;
  padding: 20px 0;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.page-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.page-input {
  width: 50px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.2s ease;
}

.page-input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.page-input.error {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.page-total {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.pagination-pages {
  display: flex;
  gap: 5px;
}

.pagination-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
  text-align: center;
  font-size: 14px;
}

.pagination-btn.nav-btn {
  padding: 8px 16px;
  font-weight: 500;
  min-width: auto;
}

.pagination-btn.page-btn {
  min-width: 35px;
}

.pagination-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #007bff;
  transform: translateY(-1px);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.pagination-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
  font-weight: 600;
}

.page-info {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}

.expense-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group-inline {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.form-hint {
  font-size: 12px;
  color: #777;
}

.form-group label {
  font-weight: bold;
  color: #333;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.category-option {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-option:hover {
  border-color: #007bff;
  background: #f0f5ff;
}

.category-option.active {
  border-color: #007bff;
  background: #007bff;
  color: #fff;
  font-weight: 600;
}

.modal-footer-buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

@media (max-width: 768px) {
  .expense-container {
    padding: 10px;
  }
  
  .page-header h2 {
    font-size: 24px;
  }

  .filter-toolbar {
    gap: 15px;
    margin: 20px 0;
  }

  .period-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .range-fields {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .range-separator {
    display: none;
  }

  .summary-cards {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .summary-card {
    padding: 15px;
  }
  
  .summary-card .amount {
    font-size: 20px;
  }
  
  .filters {
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .top-action-buttons {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 20px;
  }

  .top-action-buttons .btn {
    width: 100%;
  }

  .view-mode-toggle {
    justify-content: center;
  }

  .toggle-btn {
    flex: 1 1 120px;
    text-align: center;
  }
  
  .filter-select {
    min-width: auto;
    width: 100%;
  }
  
  .expense-item {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    padding: 15px;
  }
  
  .expense-amount {
    margin: 0;
    text-align: center;
    font-size: 16px;
  }
  
  .expense-actions {
    justify-content: center;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .collapse-toggle {
    padding: 6px 10px;
    font-size: 13px;
  }

  .section-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .fixed-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .compact-summary {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 14px;
  }

  .fixed-item {
    flex-direction: column;
    align-items: stretch;
  }

  .fixed-item-amount {
    text-align: left;
    margin: 0;
  }

  .fixed-item-actions {
    justify-content: flex-end;
  }
  
  /* 모바일에서 모달 폼 개선 */
  .expense-form {
    gap: 15px;
  }
  
  .form-group label {
    font-size: 14px;
  }

  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  /* 모바일에서 버튼 크기 조정 */
  .btn {
    padding: 10px 15px;
    font-size: 14px;
  }
  
  .btn-sm {
    padding: 8px 12px;
    font-size: 12px;
  }

  /* 모바일 페이지네이션 스타일 */
  .pagination {
    gap: 10px;
    margin: 20px 0;
    padding: 15px 0;
  }

  .pagination-controls {
    flex-direction: row;
    gap: 10px;
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
  }

  .page-input-container {
    padding: 6px 10px;
    gap: 6px;
  }

  .page-label {
    font-size: 12px;
  }

  .page-input {
    width: 45px;
    padding: 3px 6px;
    font-size: 12px;
  }

  .page-total {
    font-size: 12px;
  }

  .pagination-pages {
    flex-wrap: wrap;
    gap: 3px;
    justify-content: center;
  }

  .pagination-btn {
    padding: 6px 10px;
    font-size: 12px;
    min-width: 30px;
  }

  .pagination-btn.nav-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .pagination-btn.page-btn {
    min-width: 30px;
  }

  .page-info {
    font-size: 12px;
    margin-bottom: 15px;
  }
}
</style>