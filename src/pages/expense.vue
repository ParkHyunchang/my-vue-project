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

    <!-- 필터 -->
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
      <div v-if="filteredExpenses.length === 0" class="empty-state">
        가계부 항목이 없습니다.
      </div>
      <div v-else v-for="expense in filteredExpenses" :key="expense.id" class="expense-item">
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
      
      return filtered;
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

    const filterExpenses = () => {
      // 필터링은 computed property에서 자동으로 처리됨
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
      showDeleteModal,
      currentExpense,
      loading,
      error,
      filteredExpenses,
      openCreateModal,
      openEditModal,
      closeExpenseModal,
      saveExpense,
      openDeleteModal,
      closeDeleteModal,
      deleteExpense,
      filterExpenses,
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

/* expense 페이지 전용 스타일 */

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
  
  /* expense 페이지 모바일 전용 스타일 */
  
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
}
</style>