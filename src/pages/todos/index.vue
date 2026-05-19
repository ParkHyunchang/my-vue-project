<template>
    <div class="page-container todos-page">
        <div class="todos-header">
            <h2>To-Do List</h2>
            <div class="todos-header-actions">
                <button
                    v-if="statusFilter === 'done' && numberOfTodos > 0"
                    class="btn btn-danger todos-bulk-del"
                    @click="openBulkDeleteModal"
                    title="현재 보이는 완료 항목을 모두 삭제합니다"
                >
                    🗑 완료 전체 삭제
                </button>
                <button class="btn btn-primary" @click="moveToCreatePage">
                    ＋ 할 일 추가
                </button>
            </div>
        </div>

        <!-- 검색 + 필터 + 정렬 -->
        <div class="todos-toolbar">
            <input
                class="form-control todos-search"
                type="text"
                v-model="searchText"
                placeholder="제목·설명에서 검색"
                @keyup.enter="onFilterChanged"
            />

            <div class="todos-filter-row">
                <div class="todos-filter-group">
                    <span class="tfg-label">상태</span>
                    <button :class="['tfg-btn', { active: statusFilter === 'all' }]" @click="setStatus('all')">전체</button>
                    <button :class="['tfg-btn', { active: statusFilter === 'active' }]" @click="setStatus('active')">진행</button>
                    <button :class="['tfg-btn', { active: statusFilter === 'done' }]" @click="setStatus('done')">완료</button>
                </div>

                <div class="todos-filter-group">
                    <span class="tfg-label">우선순위</span>
                    <button :class="['tfg-btn', { active: priorityFilter === null }]" @click="setPriority(null)">전체</button>
                    <button :class="['tfg-btn pri-high', { active: priorityFilter === 3 }]" @click="setPriority(3)">🔴 높음</button>
                    <button :class="['tfg-btn pri-mid', { active: priorityFilter === 2 }]" @click="setPriority(2)">🟡 보통</button>
                    <button :class="['tfg-btn pri-low', { active: priorityFilter === 1 }]" @click="setPriority(1)">🟢 낮음</button>
                </div>

                <div v-if="categories.length" class="todos-filter-group">
                    <span class="tfg-label">카테고리</span>
                    <button :class="['tfg-btn', { active: !categoryFilter }]" @click="setCategory('')">전체</button>
                    <button
                        v-for="c in categories"
                        :key="c"
                        :class="['tfg-btn', { active: categoryFilter === c }]"
                        @click="setCategory(c)"
                    >#{{ c }}</button>
                </div>

                <div class="todos-filter-group todos-sort">
                    <span class="tfg-label">정렬</span>
                    <select v-model="sortKey" @change="onFilterChanged" class="form-control tfg-select">
                        <option value="created">생성일</option>
                        <option value="due">마감일</option>
                        <option value="priority">우선순위</option>
                        <option value="title">제목</option>
                    </select>
                    <button class="tfg-btn dir-btn" :title="sortDir === 'asc' ? '오름차순' : '내림차순'" @click="toggleDir">
                        {{ sortDir === 'asc' ? '↑' : '↓' }}
                    </button>
                </div>

                <button
                    v-if="hasActiveFilter"
                    class="tfg-btn tfg-reset"
                    @click="resetFilters"
                    title="모든 필터 초기화"
                >초기화</button>
            </div>

            <div class="todos-meta">
                전체 <strong>{{ numberOfTodos }}</strong>건
            </div>
        </div>

        <div v-if="loading" class="todos-loading">불러오는 중...</div>
        <div v-else-if="!todos.length" class="todos-empty">
            <div class="todos-empty-icon">📝</div>
            <p v-if="hasActiveFilter">조건에 맞는 할 일이 없습니다.</p>
            <p v-else>아직 할 일이 없습니다. 새로 추가해보세요!</p>
        </div>
        <template v-else>
            <TodoList :todos="todos" @todo-updated="fetchTodos" />
            <nav v-if="numberOfPages > 1" class="todos-pagination" aria-label="Page navigation">
                <ul class="pagination">
                    <li v-if="currentPage !== 1" class="page-item">
                        <a style="cursor: pointer" class="page-link" @click="changePage(currentPage - 1)">‹</a>
                    </li>
                    <li v-for="page in numberOfPages" :key="page" class="page-item"
                        :class="currentPage === page ? 'active' : ''">
                        <a style="cursor: pointer" class="page-link" @click="changePage(page)">{{ page }}</a>
                    </li>
                    <li v-if="numberOfPages !== currentPage" class="page-item">
                        <a style="cursor: pointer" class="page-link" @click="changePage(currentPage + 1)">›</a>
                    </li>
                </ul>
            </nav>
        </template>

        <teleport to="#modal">
            <DeleteModal
                v-if="showBulkDeleteModal"
                :title="'완료 항목 전체 삭제'"
                :message="`완료된 할 일 ${numberOfTodos}건을 모두 삭제합니다. 되돌릴 수 없습니다.`"
                @close="showBulkDeleteModal = false"
                @delete="confirmBulkDelete"
            />
        </teleport>
    </div>
</template>


<script>
import { ref, computed, watch, onMounted } from 'vue';
import TodoList from '@/components/TodoList.vue';
import DeleteModal from '@/components/DeleteModal.vue';
import axios from '@/axios';
import { useToast } from '@/composables/toast';
import { logger } from '@/utils/logger';
import { apiErrorMessage } from '@/utils/apiError';
import { useRouter } from 'vue-router';

export default {
    components: {
        TodoList,
        DeleteModal,
    },
    setup() {
        const router = useRouter();
        const todos = ref([]);
        const numberOfTodos = ref(0);
        const limit = 10;
        const currentPage = ref(1);
        const searchText = ref('');
        const statusFilter = ref('all');
        const priorityFilter = ref(null);
        const categoryFilter = ref('');
        const sortKey = ref('created');
        const sortDir = ref('desc');
        const categories = ref([]);
        const loading = ref(false);
        const showBulkDeleteModal = ref(false);
        const bulkDeleting = ref(false);

        const numberOfPages = computed(() => {
            const n = Math.ceil(Number(numberOfTodos.value) / limit);
            return n || 1;
        });

        const hasActiveFilter = computed(() => {
            return !!searchText.value
                || statusFilter.value !== 'all'
                || priorityFilter.value !== null
                || !!categoryFilter.value
                || sortKey.value !== 'created'
                || sortDir.value !== 'desc';
        });

        const { showToast } = useToast();

        const fetchTodos = async (page = currentPage.value) => {
            loading.value = true;
            currentPage.value = page;
            try {
                const params = {
                    page: page - 1,
                    size: limit,
                    sort: sortKey.value,
                    dir: sortDir.value,
                };
                if (searchText.value) params.q = searchText.value;
                if (statusFilter.value !== 'all') params.status = statusFilter.value;
                if (priorityFilter.value !== null) params.priority = priorityFilter.value;
                if (categoryFilter.value) params.category = categoryFilter.value;

                const res = await axios.get('/api/todos', { params });

                if (res.data && Array.isArray(res.data)) {
                    todos.value = res.data;
                    const total = res.headers['x-total-count'];
                    numberOfTodos.value = total ? parseInt(total) : 0;
                } else {
                    todos.value = [];
                    numberOfTodos.value = 0;
                }
            } catch (err) {
                logger.error('할 일 목록 로드 실패:', err);
                showToast(apiErrorMessage(err, '할 일 목록을 불러오지 못했습니다.'), 'danger');
            } finally {
                loading.value = false;
            }
        };

        const loadCategories = async () => {
            try {
                const res = await axios.get('/api/todos/categories');
                categories.value = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
            } catch {
                categories.value = [];
            }
        };

        const onFilterChanged = () => fetchTodos(1);

        const setStatus = (v) => { statusFilter.value = v; onFilterChanged(); };
        const setPriority = (v) => { priorityFilter.value = v; onFilterChanged(); };
        const setCategory = (v) => { categoryFilter.value = v; onFilterChanged(); };
        const toggleDir = () => { sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'; onFilterChanged(); };

        const resetFilters = () => {
            searchText.value = '';
            statusFilter.value = 'all';
            priorityFilter.value = null;
            categoryFilter.value = '';
            sortKey.value = 'created';
            sortDir.value = 'desc';
            onFilterChanged();
        };

        onMounted(async () => {
            await loadCategories();
            await fetchTodos(1);
        });

        const changePage = (page) => {
            if (page >= 1 && page <= numberOfPages.value) {
                fetchTodos(page);
            }
        };

        const moveToCreatePage = () => {
            router.push('/todos/create');
        };

        const openBulkDeleteModal = () => {
            showBulkDeleteModal.value = true;
        };

        const confirmBulkDelete = async () => {
            if (bulkDeleting.value) return;
            bulkDeleting.value = true;
            try {
                const res = await axios.delete('/api/todos/completed');
                const deleted = res.data?.deleted ?? 0;
                showToast(`완료 항목 ${deleted}건을 삭제했습니다.`, 'success');
                showBulkDeleteModal.value = false;
                await loadCategories();
                await fetchTodos(1);
            } catch (err) {
                logger.error('완료 항목 일괄 삭제 실패:', err);
                showToast(apiErrorMessage(err, '일괄 삭제에 실패했습니다.'), 'danger');
            } finally {
                bulkDeleting.value = false;
            }
        };

        let timeout = null;
        watch(searchText, () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                fetchTodos(1);
            }, 400);
        });

        return {
            todos,
            numberOfTodos,
            searchText,
            statusFilter,
            priorityFilter,
            categoryFilter,
            sortKey,
            sortDir,
            categories,
            numberOfPages,
            currentPage,
            hasActiveFilter,
            loading,
            showBulkDeleteModal,
            fetchTodos,
            onFilterChanged,
            setStatus,
            setPriority,
            setCategory,
            toggleDir,
            resetFilters,
            moveToCreatePage,
            openBulkDeleteModal,
            confirmBulkDelete,
            changePage,
        };
    }
}
</script>

<style src="@/assets/css/todos.css" scoped></style>
