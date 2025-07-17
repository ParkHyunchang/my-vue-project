import { reactive, toRefs } from 'vue'
import axios from '@/axios'

export const useExpense = () => {
    const state = reactive({
        expenses: [],
        summary: {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0
        },
        loading: false,
        error: null
    });

    const fetchExpenses = async () => {
        state.loading = true;
        try {
            const response = await axios.get('/expenses');
            state.expenses = response.data;
            state.error = null;
        } catch (error) {
            state.error = '가계부 데이터를 불러오는데 실패했습니다.';
            console.error('Error fetching expenses:', error);
        } finally {
            state.loading = false;
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await axios.get('/expenses/summary');
            state.summary = response.data;
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const createExpense = async (expenseData) => {
        try {
            const response = await axios.post('/expenses', expenseData);
            state.expenses.unshift(response.data);
            await fetchSummary();
            return response.data;
        } catch (error) {
            state.error = '가계부 항목을 추가하는데 실패했습니다.';
            console.error('Error creating expense:', error);
            throw error;
        }
    };

    const updateExpense = async (id, expenseData) => {
        try {
            const response = await axios.put(`/expenses/${id}`, expenseData);
            const index = state.expenses.findIndex(expense => expense.id === id);
            if (index !== -1) {
                state.expenses[index] = response.data;
            }
            await fetchSummary();
            return response.data;
        } catch (error) {
            state.error = '가계부 항목을 수정하는데 실패했습니다.';
            console.error('Error updating expense:', error);
            throw error;
        }
    };

    const deleteExpense = async (id) => {
        try {
            await axios.delete(`/expenses/${id}`);
            state.expenses = state.expenses.filter(expense => expense.id !== id);
            await fetchSummary();
        } catch (error) {
            state.error = '가계부 항목을 삭제하는데 실패했습니다.';
            console.error('Error deleting expense:', error);
            throw error;
        }
    };

    const fetchByType = async (type) => {
        try {
            const response = await axios.get(`/expenses/type/${type}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching expenses by type:', error);
            return [];
        }
    };

    const fetchByCategory = async (category) => {
        try {
            const response = await axios.get(`/expenses/category/${category}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching expenses by category:', error);
            return [];
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    return {
        ...toRefs(state),
        fetchExpenses,
        fetchSummary,
        createExpense,
        updateExpense,
        deleteExpense,
        fetchByType,
        fetchByCategory,
        formatCurrency,
        formatDate
    };
}; 