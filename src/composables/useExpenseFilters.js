import { ref, computed, watch } from 'vue';

export const INCOME_CATEGORIES  = ['급여', '보너스', '현금', '투자', '기타'];
export const EXPENSE_CATEGORIES  = ['식비', '교통비', '주거비', '문화생활', '의료비', '교육', '세금', '보험료', '여행', '기타'];
export const VIEW_MODE_OPTIONS   = [
    { value: 'all',      label: '전체 내역' },
    { value: 'variable', label: '변동 지출만' },
    { value: 'fixed',    label: '고정 지출만' }
];
export const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

/**
 * 가계부 필터·정렬·페이지네이션 컴포저블.
 * @param {Ref<Array>} expenses - 일반 지출 목록 (reactive ref)
 * @param {Ref<Array>} fixedExpenses - 고정 지출 목록 (reactive ref)
 */
export function useExpenseFilters(expenses, fixedExpenses) {
    const selectedType     = ref('');
    const selectedCategory = ref('');
    const sortBy           = ref('date-desc');
    const viewMode         = ref('all');

    const defaultItemsPerPage =
        typeof window !== 'undefined' && window.innerWidth <= 768 ? 5 : 10;
    const currentPage    = ref(1);
    const itemsPerPage   = ref(defaultItemsPerPage);
    const pageInput      = ref(1);
    const pageInputError = ref(false);

    // 타입에 따른 카테고리 필터 옵션
    const categoryFilterOptions = computed(() => {
        if (selectedType.value === 'INCOME')  return INCOME_CATEGORIES;
        if (selectedType.value === 'EXPENSE') return EXPENSE_CATEGORIES;
        return Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));
    });

    // 폼 내 카테고리 옵션 (현재 입력 폼의 type 기준)
    const getFormCategoryOptions = (type) =>
        type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    // viewMode에 따른 기본 목록
    const baseExpenses = computed(() => {
        if (viewMode.value === 'fixed')    return fixedExpenses.value;
        if (viewMode.value === 'variable') return expenses.value.filter(e => !e.fixed);
        return expenses.value;
    });

    // 타입·카테고리·정렬 적용 목록
    const filteredExpenses = computed(() => {
        let list = baseExpenses.value.slice();
        if (selectedType.value)     list = list.filter(e => e.type === selectedType.value);
        if (selectedCategory.value) list = list.filter(e => e.category === selectedCategory.value);
        return sortList(list, sortBy.value);
    });

    const totalPages = computed(() => {
        const pages = Math.ceil(filteredExpenses.value.length / itemsPerPage.value);
        return pages > 0 ? pages : 1;
    });

    const paginatedExpenses = computed(() => {
        const start = (currentPage.value - 1) * itemsPerPage.value;
        return filteredExpenses.value.slice(start, start + itemsPerPage.value);
    });

    const visiblePages = computed(() => {
        const total   = totalPages.value;
        const current = currentPage.value;
        const pages   = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
            return pages;
        }
        if (current <= 4) {
            for (let i = 1; i <= 5; i++) pages.push(i);
            pages.push('...'); pages.push(total);
            return pages;
        }
        if (current >= total - 3) {
            pages.push(1); pages.push('...');
            for (let i = total - 4; i <= total; i++) pages.push(i);
            return pages;
        }
        pages.push(1); pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...'); pages.push(total);
        return pages;
    });

    const goToPage = (page) => {
        if (typeof page !== 'number') return;
        if (page >= 1 && page <= totalPages.value) {
            currentPage.value = page;
            pageInput.value   = page;
            pageInputError.value = false;
        }
    };

    const resetPagination = () => {
        currentPage.value    = 1;
        pageInput.value      = 1;
        pageInputError.value = false;
    };

    // viewMode 변경 시 페이지 초기화
    watch(viewMode, resetPagination);

    return {
        selectedType, selectedCategory, sortBy, viewMode,
        currentPage, itemsPerPage, pageInput, pageInputError,
        categoryFilterOptions, baseExpenses, filteredExpenses,
        totalPages, paginatedExpenses, visiblePages,
        goToPage, resetPagination, getFormCategoryOptions,
        INCOME_CATEGORIES, EXPENSE_CATEGORIES,
        VIEW_MODE_OPTIONS, ITEMS_PER_PAGE_OPTIONS
    };
}

// ── 정렬 로직 (순수 함수) ─────────────────────────────────────────

function sortList(list, key) {
    const sorted = [...list];
    switch (key) {
        case 'date-asc':    return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'amount-desc': return sorted.sort((a, b) => b.amount - a.amount);
        case 'amount-asc':  return sorted.sort((a, b) => a.amount - b.amount);
        case 'title-asc':   return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':  return sorted.sort((a, b) => b.title.localeCompare(a.title));
        default:            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
}
