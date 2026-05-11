<template>
  <div class="expense-container">
    <div class="page-header">
      <h2>가계부</h2>
    </div>

    <ExpenseSummaryCards
      :summary="currentPeriodSummary"
      :format-currency="formatCurrency"
    />

    <div class="filter-toolbar">
      <ExpensePeriodFilter
        :period-filter="periodFilter"
        :selected-month="selectedMonth"
        :custom-start-date="customStartDate"
        :custom-end-date="customEndDate"
        :period-label="periodLabel"
        :date-range-error="dateRangeError"
        @set-period="setPeriod"
        @update:selected-month="selectedMonth = $event"
        @update:custom-start-date="customStartDate = $event"
        @update:custom-end-date="customEndDate = $event"
      />

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

    <FixedExpenseSection
      :fixed-expenses="fixedExpenses"
      :fixed-expenses-total="fixedExpensesTotal"
      :fixed-collapsed="fixedCollapsed"
      :fixed-loading="fixedLoading"
      :is-importing-fixed="isImportingFixed"
      :can-import-to-current-view="canImportToCurrentView"
      :import-button-label="importButtonLabel"
      :format-currency="formatCurrency"
      :format-date="formatDate"
      @toggle="toggleFixedSection"
      @create-fixed="openCreateFixedModal"
      @import-fixed="importFixedExpenses"
      @edit="openEditModal"
      @delete="openDeleteModal"
    />

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

    <ExpenseList
      v-if="!loading && !error"
      :expenses="paginatedExpenses"
      :format-currency="formatCurrency"
      :format-date="formatDate"
      @edit="openEditModal"
      @delete="openDeleteModal"
    />

    <ExpensePagination
      v-if="!loading && !error && filteredExpenses.length > 0"
      :current-page="currentPage"
      :total-pages="totalPages"
      :visible-pages="visiblePages"
      :page-input="pageInput"
      :page-input-error="pageInputError"
      @go-to-page="goToPage"
      @go-to-input-page="goToInputPage"
      @update:page-input="pageInput = $event"
    />

    <div
      v-if="!loading && !error && filteredExpenses.length > 0"
      class="page-info"
    >
      {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredExpenses.length) }} / {{ filteredExpenses.length }}개 항목
    </div>

    <ExpenseFormModal
      :show="showExpenseModal"
      :is-editing="isEditing"
      v-model="currentExpense"
      :form-category-options="formCategoryOptions"
      @close="closeExpenseModal"
      @save="saveExpense"
      @delete="openDeleteModal"
    />

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
import DeleteModal from '@/components/DeleteModal.vue';
import ExpenseSummaryCards from '@/components/expense/ExpenseSummaryCards.vue';
import ExpensePeriodFilter from '@/components/expense/ExpensePeriodFilter.vue';
import FixedExpenseSection from '@/components/expense/FixedExpenseSection.vue';
import ExpenseList from '@/components/expense/ExpenseList.vue';
import ExpensePagination from '@/components/expense/ExpensePagination.vue';
import ExpenseFormModal from '@/components/expense/ExpenseFormModal.vue';
import { useToast } from '@/composables/toast';
import { logger } from '@/utils/logger';
import { apiErrorMessage } from '@/utils/apiError';
import axios from '@/axios';
import {
  useExpensePeriod,
  formatDateInputValue,
  buildCreatedAtForImport,
} from '@/composables/useExpensePeriod';
import {
  useExpenseFilters,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  VIEW_MODE_OPTIONS,
  ITEMS_PER_PAGE_OPTIONS,
} from '@/composables/useExpenseFilters';

export default {
  components: {
    DeleteModal,
    ExpenseSummaryCards,
    ExpensePeriodFilter,
    FixedExpenseSection,
    ExpenseList,
    ExpensePagination,
    ExpenseFormModal,
  },
  setup() {
    const { showToast } = useToast();

    // ── 데이터 상태 ────────────────────────────────────────────────
    const expenses        = ref([]);
    const fixedExpenses   = ref([]);
    const fixedCollapsed  = ref(true);
    const isImportingFixed = ref(false);
    const summary    = ref({ totalIncome: 0, totalExpense: 0, balance: 0, totalFixedExpense: 0 });
    const loading    = ref(false);
    const fixedLoading = ref(false);
    const error      = ref('');
    const totalRecords = ref(0);

    // ── UI 상태 ─────────────────────────────────────────────────
    const showExpenseModal = ref(false);
    const isEditing       = ref(false);
    const showDeleteModal  = ref(false);
    const expenseToDelete  = ref(null);
    const currentExpense   = ref({
      id: undefined, title: '', amount: null,
      category: EXPENSE_CATEGORIES[0], type: 'EXPENSE',
      fixed: false, date: formatDateInputValue(new Date()), description: ''
    });

    // ── API 함수 (컴포저블보다 먼저 정의, 콜백에서 참조) ──────────
    const fetchExpenses = async (range) => {
      loading.value = true;
      error.value = '';
      try {
        let response;
        if (range?.startDate && range?.endDate) {
          response = await axios.get('/api/expenses/date-range', { params: { startDate: range.startDate, endDate: range.endDate } });
          totalRecords.value = Array.isArray(response.data) ? response.data.length : 0;
        } else {
          response = await axios.get('/api/expenses', { params: { page: 0, size: 500 } });
          const headerTotal = Number(response.headers?.['x-total-count']);
          totalRecords.value = Number.isNaN(headerTotal) ? response.data.length : headerTotal;
        }
        expenses.value = Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        logger.error('Error fetching expenses:', err);
        const msg = apiErrorMessage(err, '가계부 데이터를 불러오는데 실패했습니다.');
        error.value = msg;
        showToast(msg, 'danger');
      } finally {
        loading.value = false;
      }
    };

    const fetchSummary = async (range) => {
      try {
        let response;
        if (range?.startDate && range?.endDate) {
          response = await axios.get('/api/expenses/summary/date-range', { params: { startDate: range.startDate, endDate: range.endDate } });
        } else {
          response = await axios.get('/api/expenses/summary');
        }
        summary.value = {
          totalIncome: response.data?.totalIncome ?? 0,
          totalExpense: response.data?.totalExpense ?? 0,
          balance: response.data?.balance ?? 0,
          totalFixedExpense: response.data?.totalFixedExpense ?? 0
        };
      } catch (err) {
        logger.error('Error fetching summary:', err);
      }
    };

    const fetchFixedExpenses = async () => {
      fixedLoading.value = true;
      try {
        const response = await axios.get('/api/expenses/fixed');
        fixedExpenses.value = Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        logger.error('Error fetching fixed expenses:', err);
      } finally {
        fixedLoading.value = false;
      }
    };

    // ── 컴포저블 (API 함수 정의 후 생성) ─────────────────────────
    const filters = useExpenseFilters(expenses, fixedExpenses);
    const period  = useExpensePeriod(async () => {
      const range = period.getPeriodRange();
      await Promise.all([fetchExpenses(range), fetchSummary(range)]);
      filters.resetPagination();
    });

    const {
      periodFilter, selectedMonth, customStartDate, customEndDate,
      dateRangeError, periodLabel, getPeriodRange, setPeriod
    } = period;

    const {
      selectedType, selectedCategory, sortBy, viewMode,
      currentPage, itemsPerPage, pageInput, pageInputError,
      categoryFilterOptions, filteredExpenses,
      totalPages, paginatedExpenses, visiblePages,
      goToPage, resetPagination, getFormCategoryOptions
    } = filters;

    // ── computed ────────────────────────────────────────────────
    const canImportToCurrentView = computed(() =>
      ['current-month', 'previous-month'].includes(periodFilter.value)
    );
    const importButtonLabel = computed(() => {
      if (!canImportToCurrentView.value) return '선택된 기간에 추가할 수 없습니다';
      return periodFilter.value === 'previous-month' ? '지난 달에 고정 지출 추가' : '이번 달에 고정 지출 추가';
    });
    const formCategoryOptions   = computed(() => getFormCategoryOptions(currentExpense.value.type));
    const fixedExpensesForPeriod = computed(() => expenses.value.filter(e => e.fixed));
    const fixedExpensesTotal    = computed(() => fixedExpenses.value.reduce((acc, e) => acc + (e.amount || 0), 0));
    const currentPeriodSummary  = computed(() => ({
      totalIncome: summary.value.totalIncome || 0,
      totalExpense: summary.value.totalExpense || 0,
      balance: summary.value.balance || 0,
      totalFixedExpense: summary.value.totalFixedExpense || 0
    }));

    // ── 오케스트레이션 ───────────────────────────────────────────
    const loadExpensesForCurrentPeriod = async () => {
      const range = getPeriodRange();
      await Promise.all([fetchExpenses(range), fetchSummary(range)]);
      resetPagination();
    };

    // ── 폼 헬퍼 ────────────────────────────────────────────────
    const resetForm = () => {
      currentExpense.value = {
        id: undefined, title: '', amount: null,
        category: EXPENSE_CATEGORIES[0], type: 'EXPENSE',
        fixed: false, date: formatDateInputValue(new Date()), description: ''
      };
    };

    const computeDefaultDateForCurrentPeriod = () => {
      if (periodFilter.value === 'previous-month') {
        const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
        return formatDateInputValue(prev);
      }
      if (periodFilter.value === 'custom-month' && selectedMonth.value) {
        const [year, month] = selectedMonth.value.split('-');
        if (year && month) return `${year}-${month}-01`;
      }
      if (periodFilter.value === 'custom-range' && customStartDate.value) return customStartDate.value;
      return formatDateInputValue(new Date());
    };

    // ── 모달 ────────────────────────────────────────────────────
    const openCreateModal = () => {
      isEditing.value = false; resetForm();
      currentExpense.value.date = computeDefaultDateForCurrentPeriod();
      showExpenseModal.value = true;
    };

    const openCreateFixedModal = () => {
      isEditing.value = false; resetForm();
      Object.assign(currentExpense.value, { type: 'EXPENSE', fixed: true, category: '주거비', date: computeDefaultDateForCurrentPeriod() });
      showExpenseModal.value = true;
    };

    const openEditModal = (expense) => {
      isEditing.value = true;
      currentExpense.value = { id: expense.id, title: expense.title, description: expense.description, amount: expense.amount, category: expense.category, type: expense.type, fixed: !!expense.fixed, date: formatDateInputValue(expense.createdAt) };
      showExpenseModal.value = true;
    };

    const closeExpenseModal = () => { showExpenseModal.value = false; resetForm(); };

    const saveExpense = async () => {
      const { date, ...rest } = currentExpense.value;
      const payload = { ...rest, amount: Number(currentExpense.value.amount) };
      if (Number.isNaN(payload.amount)) { showToast('금액을 확인해주세요.', 'danger'); return; }
      if (date) payload.createdAt = `${date}T00:00:00`;
      try {
        if (isEditing.value) {
          await axios.put(`/api/expenses/${payload.id}`, payload);
          showToast('가계부 항목이 수정되었습니다.', 'success');
        } else {
          await axios.post('/api/expenses', payload);
          showToast('가계부 항목이 추가되었습니다.', 'success');
        }
        closeExpenseModal();
        await loadExpensesForCurrentPeriod();
        await fetchFixedExpenses();
      } catch (err) {
        logger.error('Error saving expense:', err);
        showToast(apiErrorMessage(err, '가계부 항목 저장에 실패했습니다.'), 'danger');
      }
    };

    const openDeleteModal  = (expense) => { expenseToDelete.value = expense; showDeleteModal.value = true; };
    const closeDeleteModal = () => { showDeleteModal.value = false; expenseToDelete.value = null; };

    const deleteExpense = async () => {
      if (!expenseToDelete.value?.id) return;
      try {
        await axios.delete(`/api/expenses/${expenseToDelete.value.id}`);
        showToast('가계부 항목이 삭제되었습니다.', 'success');
        closeDeleteModal();
        await loadExpensesForCurrentPeriod();
        await fetchFixedExpenses();
      } catch (err) {
        logger.error('Error deleting expense:', err);
        showToast(apiErrorMessage(err, '가계부 항목 삭제에 실패했습니다.'), 'danger');
      }
    };

    // ── 고정 지출 ───────────────────────────────────────────────
    const toggleFixedSection = () => { fixedCollapsed.value = !fixedCollapsed.value; };

    const importFixedExpenses = async () => {
      if (fixedExpenses.value.length === 0 || isImportingFixed.value) return;
      if (!canImportToCurrentView.value) { showToast('현재 선택한 기간에는 고정 지출을 일괄 추가할 수 없습니다.', 'warning'); return; }
      isImportingFixed.value = true;
      showToast('고정 지출을 추가하고 있습니다...', 'info');
      const targetDate = new Date();
      if (periodFilter.value === 'previous-month') targetDate.setMonth(targetDate.getMonth() - 1);
      targetDate.setDate(1); targetDate.setHours(0, 0, 0, 0);
      const successMessage = periodFilter.value === 'previous-month' ? '지난 달에 고정 지출 항목을 추가했습니다.' : '이번 달에 고정 지출 항목을 추가했습니다.';
      try {
        const payloads = fixedExpenses.value.map((e) => ({ title: e.title, description: e.description, amount: e.amount, category: e.category, type: 'EXPENSE', fixed: false, createdAt: buildCreatedAtForImport(e, targetDate) }));
        await Promise.all(payloads.map((p) => axios.post('/api/expenses', p)));
        await loadExpensesForCurrentPeriod();
        showToast(successMessage, 'success');
      } catch (err) {
        logger.error('Error importing fixed expenses:', err);
        showToast(apiErrorMessage(err, '고정 지출 항목 추가에 실패했습니다.'), 'danger');
      } finally {
        isImportingFixed.value = false;
      }
    };

    // ── 필터 이벤트 핸들러 ──────────────────────────────────────
    const filterExpenses    = () => resetPagination();
    const sortExpenses      = () => resetPagination();
    const changeItemsPerPage = () => resetPagination();
    const setViewMode       = (mode) => { viewMode.value = mode; };

    const onTypeFilterChange = () => {
      const cats = selectedType.value === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      if (selectedType.value && selectedCategory.value && !cats.includes(selectedCategory.value)) {
        selectedCategory.value = '';
      }
      resetPagination();
    };

    // ── 직접 페이지 입력 ─────────────────────────────────────────
    const goToInputPage = () => {
      const inputPage = parseInt(pageInput.value, 10);
      if (Number.isNaN(inputPage) || inputPage < 1 || inputPage > totalPages.value) {
        pageInputError.value = true; pageInput.value = currentPage.value; return;
      }
      pageInputError.value = false; currentPage.value = inputPage;
    };

    // ── watch ────────────────────────────────────────────────────
    watch(() => currentExpense.value.type, (type) => {
      const options = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      if (!options.includes(currentExpense.value.category)) currentExpense.value.category = options[0];
      if (type === 'INCOME') currentExpense.value.fixed = false;
    });

    onMounted(async () => {
      await loadExpensesForCurrentPeriod();
      await fetchFixedExpenses();
    });

    // ── UI 포맷터 ─────────────────────────────────────────────────
    const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount || 0);
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('ko-KR') : '';

    return {
      // 데이터
      expenses, summary, fixedExpenses, fixedExpensesForPeriod, fixedCollapsed,
      isImportingFixed, canImportToCurrentView, importButtonLabel,
      currentPeriodSummary, fixedExpensesTotal,
      // UI
      showExpenseModal, isEditing, showDeleteModal, currentExpense, loading, fixedLoading, error,
      // 컴포저블 상태
      selectedType, selectedCategory, sortBy, viewMode,
      periodFilter, selectedMonth, customStartDate, customEndDate, dateRangeError,
      currentPage, itemsPerPage, pageInput, pageInputError,
      // 컴포저블 computed
      filteredExpenses, paginatedExpenses, totalPages, visiblePages, periodLabel,
      categoryFilterOptions, formCategoryOptions,
      // 상수 (템플릿에서 참조)
      viewModeOptions: VIEW_MODE_OPTIONS,
      itemsPerPageOptions: ITEMS_PER_PAGE_OPTIONS,
      // 이벤트 핸들러
      openCreateModal, openCreateFixedModal, openEditModal, closeExpenseModal, saveExpense,
      openDeleteModal, closeDeleteModal, deleteExpense,
      filterExpenses, sortExpenses, toggleFixedSection, importFixedExpenses,
      changeItemsPerPage, setPeriod, setViewMode, goToPage, goToInputPage,
      formatCurrency, formatDate, onTypeFilterChange
    };
  }
};
</script>

<style src="@/assets/css/expense.css" scoped></style>
