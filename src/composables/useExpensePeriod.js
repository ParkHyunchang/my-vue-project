import { ref, computed, watch } from 'vue';

// ── 날짜 유틸리티 ────────────────────────────────────────────────

export const formatMonthValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export const buildMonthRange = (year, month) => {
    const monthString = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dayString = String(lastDay).padStart(2, '0');
    return {
        startDate: `${year}-${monthString}-01T00:00:00`,
        endDate: `${year}-${monthString}-${dayString}T23:59:59`
    };
};

export const formatDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const buildCreatedAtForImport = (expense, targetDate) => {
    const year  = targetDate.getFullYear();
    const month = targetDate.getMonth();
    let day = 1;
    if (expense.createdAt) {
        const src = new Date(expense.createdAt);
        if (!Number.isNaN(src.getTime())) day = src.getDate();
    }
    const lastDay   = new Date(year, month + 1, 0).getDate();
    const safeDay   = Math.min(day, lastDay);
    const monthStr  = String(month + 1).padStart(2, '0');
    const dayStr    = String(safeDay).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}T00:00:00`;
};

export const formatDateTimeForBoundary = (dateString, boundary) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const time = boundary === 'start' ? '00:00:00' : '23:59:59';
    return `${year}-${month}-${day}T${time}`;
};

export const monthLabel = (value) => {
    if (!value) return '';
    const [year, month] = value.split('-');
    if (!year || !month) return '';
    return `${year}년 ${Number(month)}월`;
};

export const dateLabel = (value) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return '';
    return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

// ── 기간 선택 컴포저블 ────────────────────────────────────────────

/**
 * 가계부 기간 필터 로직.
 * @param {Function} onReload - 기간이 변경될 때 데이터 재조회를 요청하는 콜백
 */
export function useExpensePeriod(onReload) {
    const periodFilter    = ref('current-month');
    const selectedMonth   = ref(formatMonthValue(new Date()));
    const customStartDate = ref('');
    const customEndDate   = ref('');
    const dateRangeError  = ref('');

    const periodLabel = computed(() => {
        switch (periodFilter.value) {
            case 'all':           return '전체 기간';
            case 'current-month': return `${monthLabel(selectedMonth.value)} (이번 달)`;
            case 'previous-month':return `${monthLabel(selectedMonth.value)} (지난 달)`;
            case 'custom-month':
                return selectedMonth.value
                    ? monthLabel(selectedMonth.value)
                    : '조회할 달을 선택하세요';
            case 'custom-range':
                return customStartDate.value && customEndDate.value
                    ? `${dateLabel(customStartDate.value)} ~ ${dateLabel(customEndDate.value)}`
                    : '조회할 기간을 선택하세요';
            default: return '';
        }
    });

    const getPeriodRange = () => {
        if (periodFilter.value === 'all') return null;

        if (['current-month', 'previous-month', 'custom-month'].includes(periodFilter.value)) {
            if (!selectedMonth.value) return null;
            const [yearStr, monthStr] = selectedMonth.value.split('-');
            const year = Number(yearStr);
            const month = Number(monthStr);
            if (!year || !month) return null;
            return buildMonthRange(year, month);
        }

        if (periodFilter.value === 'custom-range') {
            if (!customStartDate.value || !customEndDate.value) return null;
            return {
                startDate: formatDateTimeForBoundary(customStartDate.value, 'start'),
                endDate: formatDateTimeForBoundary(customEndDate.value, 'end')
            };
        }
        return null;
    };

    const setPeriod = async (value) => {
        periodFilter.value = value;
        dateRangeError.value = '';

        if (value === 'all') {
            selectedMonth.value   = '';
            customStartDate.value = '';
            customEndDate.value   = '';
            await onReload();
            return;
        }
        if (value === 'current-month') {
            selectedMonth.value = formatMonthValue(new Date());
            await onReload();
            return;
        }
        if (value === 'previous-month') {
            const base = new Date();
            base.setMonth(base.getMonth() - 1);
            selectedMonth.value = formatMonthValue(base);
            await onReload();
            return;
        }
        if (value === 'custom-month') {
            if (!selectedMonth.value) selectedMonth.value = formatMonthValue(new Date());
            await onReload();
            return;
        }
        if (value === 'custom-range') {
            if (customStartDate.value && customEndDate.value) {
                if (new Date(customStartDate.value) > new Date(customEndDate.value)) {
                    dateRangeError.value = '시작일이 종료일보다 이후입니다.';
                    return;
                }
                await onReload();
            }
        }
    };

    // custom-month 값 변경 시 자동 재조회
    watch(selectedMonth, async (value, oldValue) => {
        if (periodFilter.value === 'custom-month' && value && value !== oldValue) {
            await onReload();
        }
    });

    // custom-range 날짜 변경 시 유효성 검사 + 자동 재조회
    watch([customStartDate, customEndDate], async ([start, end]) => {
        if (periodFilter.value !== 'custom-range') return;
        if (!start || !end) { dateRangeError.value = ''; return; }
        if (new Date(start) > new Date(end)) {
            dateRangeError.value = '시작일이 종료일보다 이후입니다.';
            return;
        }
        dateRangeError.value = '';
        await onReload();
    });

    return {
        periodFilter, selectedMonth, customStartDate, customEndDate,
        dateRangeError, periodLabel,
        getPeriodRange, setPeriod
    };
}
