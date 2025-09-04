<template>
  <div class="expense-container">
    <div class="page-header">
      <h2>가계부</h2>
      <button class="btn btn-primary" @click="openCreateModal">
        + 새 항목 추가
      </button>
    </div>

    <!-- 요약 정보 -->
    <div class="summary-cards">
      <div class="summary-card income">
        <h3>총 수입</h3>
        <p class="amount">{{ formatCurrency(summary.totalIncome) }}원</p>
      </div>
      <div class="summary-card expense">
        <h3>총 지출</h3>
        <p class="amount">{{ formatCurrency(summary.totalExpense) }}원</p>
      </div>
      <div class="summary-card balance" :class="{ negative: summary.balance < 0 }">
        <h3>잔액</h3>
        <p class="amount">{{ formatCurrency(summary.balance) }}원</p>
      </div>
    </div>

    <!-- 필터 및 정렬 -->
    <div class="filters">
      <select v-model="selectedType" @change="filterExpenses" class="filter-select">
        <option value="">전체</option>
        <option value="INCOME">수입</option>
        <option value="EXPENSE">지출</option>
      </select>
      <select v-model="selectedCategory" @change="filterExpenses" class="filter-select">
        <option value="">전체 카테고리</option>
        <option value="급여">급여</option>
        <option value="식비">식비</option>
        <option value="교통비">교통비</option>
        <option value="주거비">주거비</option>
        <option value="문화생활">문화생활</option>
        <option value="의료비">의료비</option>
        <option value="기타">기타</option>
      </select>
      <select v-model="sortBy" @change="sortExpenses" class="filter-select">
        <option value="date-desc">최신순</option>
        <option value="date-asc">오래된순</option>
        <option value="amount-desc">금액 높은순</option>
        <option value="amount-asc">금액 낮은순</option>
        <option value="title-asc">제목 가나다순</option>
        <option value="title-desc">제목 역순</option>
      </select>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading">
      데이터를 불러오는 중...
    </div>

    <!-- 에러 메시지 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 가계부 목록 -->
    <div v-if="!loading && !error" class="expense-list">
      <div v-if="paginatedExpenses.length === 0" class="empty-state">
        가계부 항목이 없습니다.
      </div>
      <div v-else v-for="expense in paginatedExpenses" :key="expense.id" class="expense-item">
        <div class="expense-info">
          <h4>{{ expense.title }}</h4>
          <p class="description">{{ expense.description }}</p>
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

    <!-- 페이지네이션 -->
    <div v-if="!loading && !error && filteredExpenses.length > 0" class="pagination">
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
            :class="{ 'error': pageInputError }"
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

    <!-- 페이지 정보 -->
    <div v-if="!loading && !error && filteredExpenses.length > 0" class="page-info">
      {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredExpenses.length) }} / {{ filteredExpenses.length }}개 항목
    </div>

    <!-- 추가/수정 모달 -->
    <teleport to="#modal">
      <Modal v-if="showExpenseModal" @close="closeExpenseModal">
        <template #header>
          <h3>{{ isEditing ? '가계부 수정' : '새 항목 추가' }}</h3>
        </template>
        <template #body>
          <form @submit.prevent="saveExpense" class="expense-form">
            <div class="form-group">
              <label>제목</label>
              <input
                v-model="currentExpense.title"
                type="text"
                class="form-control"
                required
              />
            </div>
            <div class="form-group">
              <label>설명</label>
              <textarea
                v-model="currentExpense.description"
                class="form-control"
                rows="3"
              ></textarea>
            </div>
            <div class="form-group">
              <label>금액</label>
              <input
                v-model="currentExpense.amount"
                type="number"
                class="form-control"
                required
                min="0"
              />
            </div>
            <div class="form-group">
              <label>카테고리</label>
              <select
                v-model="currentExpense.category"
                class="form-control"
                required
              >
                <option value="급여">급여</option>
                <option value="식비">식비</option>
                <option value="교통비">교통비</option>
                <option value="주거비">주거비</option>
                <option value="문화생활">문화생활</option>
                <option value="의료비">의료비</option>
                <option value="기타">기타</option>
              </select>
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
          </form>
        </template>
        <template #footer>
          <div class="modal-footer-buttons">
            <div>
              <button
                type="button"
                class="btn btn-danger"
                @click="openDeleteModal(currentExpense)"
                v-if="isEditing"
              >
                삭제
              </button>
            </div>
            <div>
              <button
                type="button"
                class="btn btn-secondary"
                @click="closeExpenseModal"
              >
                취소
              </button>
              <button type="button" class="btn btn-primary" @click="saveExpense">
                {{ isEditing ? '수정' : '저장' }}
              </button>
            </div>
          </div>
        </template>
      </Modal>
    </teleport>

    <!-- 삭제 확인 모달 -->
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
import { ref, computed, onMounted } from 'vue';
import Modal from '@/components/Modal.vue';
import DeleteModal from '@/components/DeleteModal.vue';
import { useToast } from '@/composables/toast';
import axios from '@/axios';

export default {
  components: {
    Modal,
    DeleteModal,
  },
  setup() {
    const { triggerToast } = useToast();
    const expenses = ref([]);
    const summary = ref({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0
    });
    const showExpenseModal = ref(false);
    const isEditing = ref(false);
    const selectedType = ref('');
    const selectedCategory = ref('');
    const sortBy = ref('date-desc');
    const currentPage = ref(1);
    const itemsPerPage = ref(5);
    const pageInput = ref(1);
    const pageInputError = ref(false);
    const showDeleteModal = ref(false);
    const expenseToDelete = ref(null);
    const loading = ref(false);
    const error = ref('');

    const currentExpense = ref({
      title: '',
      description: '',
      amount: '',
      category: '기타',
      type: 'EXPENSE'
    });

    const filteredExpenses = computed(() => {
      let filtered = expenses.value;
      
      if (selectedType.value) {
        filtered = filtered.filter(expense => expense.type === selectedType.value);
      }
      
      if (selectedCategory.value) {
        filtered = filtered.filter(expense => expense.category === selectedCategory.value);
      }
      
      // 정렬 적용
      return sortExpensesList(filtered);
    });

    const totalPages = computed(() => {
      return Math.ceil(filteredExpenses.value.length / itemsPerPage.value);
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
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        if (current <= 4) {
          for (let i = 1; i <= 5; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        } else if (current >= total - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = total - 4; i <= total; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = current - 1; i <= current + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(total);
        }
      }
      
      return pages;
    });

    const fetchExpenses = async () => {
      loading.value = true;
      error.value = '';
      try {
        const response = await axios.get('/expenses');
        expenses.value = response.data;
      } catch (err) {
        console.error('Error fetching expenses:', err);
        error.value = '가계부 데이터를 불러오는데 실패했습니다.';
        triggerToast('가계부 데이터를 불러오는데 실패했습니다.', 'danger');
      } finally {
        loading.value = false;
      }
    };

    const fetchSummary = async () => {
      try {
        const response = await axios.get('/expenses/summary');
        summary.value = response.data;
      } catch (err) {
        console.error('Error fetching summary:', err);
      }
    };

    const resetForm = () => {
      currentExpense.value = {
        title: '',
        description: '',
        amount: '',
        category: '기타',
        type: 'EXPENSE'
      };
    };

    const openCreateModal = () => {
      isEditing.value = false;
      resetForm();
      showExpenseModal.value = true;
    };

    const openEditModal = (expense) => {
      isEditing.value = true;
      currentExpense.value = {
        id: expense.id,
        title: expense.title,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        type: expense.type
      };
      showExpenseModal.value = true;
    };

    const closeExpenseModal = () => {
      showExpenseModal.value = false;
      resetForm();
    };

    const saveExpense = async () => {
      try {
        if (isEditing.value) {
          await axios.put(`/expenses/${currentExpense.value.id}`, currentExpense.value);
          triggerToast('가계부 항목이 수정되었습니다.', 'success');
        } else {
          await axios.post('/expenses', currentExpense.value);
          triggerToast('가계부 항목이 추가되었습니다.', 'success');
        }
        
        await fetchExpenses();
        await fetchSummary();
        closeExpenseModal();
      } catch (err) {
        console.error('Error saving expense:', err);
        triggerToast('가계부 항목 저장에 실패했습니다.', 'danger');
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
      try {
        await axios.delete(`/expenses/${expenseToDelete.value.id}`);
        await fetchExpenses();
        await fetchSummary();
        triggerToast('가계부 항목이 삭제되었습니다.', 'success');
        closeDeleteModal();
      } catch (err) {
        console.error('Error deleting expense:', err);
        triggerToast('가계부 항목 삭제에 실패했습니다.', 'danger');
      }
    };

    const sortExpensesList = (expenses) => {
      const sorted = [...expenses];
      
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

    const sortExpenses = () => {
      currentPage.value = 1; // 정렬 시 첫 페이지로 이동
    };

    const filterExpenses = () => {
      currentPage.value = 1; // 필터링 시 첫 페이지로 이동
    };

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
        pageInput.value = page;
        pageInputError.value = false;
      }
    };

    const goToInputPage = () => {
      const inputPage = parseInt(pageInput.value);
      
      if (isNaN(inputPage) || inputPage < 1 || inputPage > totalPages.value) {
        pageInputError.value = true;
        pageInput.value = currentPage.value; // 잘못된 입력 시 현재 페이지로 복원
        return;
      }
      
      pageInputError.value = false;
      currentPage.value = inputPage;
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('ko-KR');
    };

    onMounted(() => {
      fetchExpenses();
      fetchSummary();
    });

    return {
      expenses,
      summary,
      showExpenseModal,
      isEditing,
      selectedType,
      selectedCategory,
      sortBy,
      currentPage,
      itemsPerPage,
      pageInput,
      pageInputError,
      showDeleteModal,
      currentExpense,
      loading,
      error,
      filteredExpenses,
      paginatedExpenses,
      totalPages,
      visiblePages,
      openCreateModal,
      openEditModal,
      closeExpenseModal,
      saveExpense,
      openDeleteModal,
      closeDeleteModal,
      deleteExpense,
      filterExpenses,
      sortExpenses,
      goToPage,
      goToInputPage,
      formatCurrency,
      formatDate
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0;
  color: #333;
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

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
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

.expense-info h4 {
  margin: 0 0 5px 0;
  color: #333;
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

.form-group label {
  font-weight: bold;
  color: #333;
}

.modal-footer-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 768px) {
  .expense-container {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .page-header h2 {
    font-size: 24px;
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
  
  /* 모바일에서 모달 폼 개선 */
  .expense-form {
    gap: 15px;
  }
  
  .form-group label {
    font-size: 14px;
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
    flex-direction: column;
    gap: 10px;
    width: 100%;
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