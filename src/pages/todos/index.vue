<template>
    <div class="page-container">
        <div class="d-flex justify-content-between mb-3">
            <h2>To-Do List</h2>
            <button class="btn btn-primary" @click="moveToCreatePage">
                Create Todo
            </button>
        </div>

        <input class="form-control" type="text" v-model="searchText" placeholder="Search" @keyup.enter="searchTodo">
        <hr />

        <div v-if="loading">Loading...</div>
        <div v-else-if="!todos.length">
            There is nothing to display
        </div>
        <template v-else>
            <TodoList :todos="todos" @todo-updated="fetchTodos" />
            <hr />
            <nav v-if="numberOfPages > 1" aria-label="Page navigation">
                <ul class="pagination">
                    <li v-if="currentPage !== 1" class="page-item">
                        <a style="cursor: pointer" class="page-link" @click="changePage(currentPage - 1)">
                            Previous
                        </a>
                    </li>
                    <li v-for="page in numberOfPages" :key="page" class="page-item"
                        :class="currentPage === page ? 'active' : ''">
                        <a style="cursor: pointer" class="page-link" @click="changePage(page)">{{ page }}</a>
                    </li>
                    <li v-if="numberOfPages !== currentPage" class="page-item">
                        <a style="cursor: pointer" class="page-link" @click="changePage(currentPage + 1)">Next</a>
                    </li>
                </ul>
            </nav>
        </template>
    </div>
</template>


<script>
/* eslint-disable no-console */
import { ref, computed, watch, onMounted } from 'vue';
import TodoList from '@/components/TodoList.vue';
import axios from '@/axios';
import { useToast } from '@/composables/toast';
import { useRouter } from 'vue-router';

export default {
    components: {
        TodoList,
    },
    setup() {
        const router = useRouter();
        const todos = ref([]);
        const error = ref('');
        const numberOfTodos = ref(0);
        const limit = 5;
        const currentPage = ref(1);
        const searchText = ref('');
        const loading = ref(false);
        const numberOfPages = computed(() => {
            const n = Math.ceil(Number(numberOfTodos.value) / limit);
            return n || 1;  // 최소 1페이지
        });

        const {
            toastMessage,
            toastAlertType,
            showToast
        } = useToast();

        // 서버에서 페이징/검색 적용해서 가져오기
        const fetchTodos = async (page = currentPage.value) => {
            loading.value = true;
            currentPage.value = page;
            try {
                const params = {
                    page: page - 1,
                    size: limit,
                };
                if (searchText.value) params.q = searchText.value;
                const res = await axios.get('todos', { params });
                
                // 백엔드에서 반환된 페이지 정보 처리
                if (res.data && Array.isArray(res.data)) {
                    todos.value = res.data;
                    // 전체 개수는 헤더에서 가져옴
                    const total = res.headers['x-total-count'];
                    numberOfTodos.value = total ? parseInt(total) : 0;
                } else {
                    todos.value = [];
                    numberOfTodos.value = 0;
                }
            } catch (err) {
                console.error('할 일 목록 로드 실패:', err);
                error.value = 'Something went wrong.';
                showToast('Something went wrong', 'danger')
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => fetchTodos(1));

        const changePage = (page) => {
            if (page >= 1 && page <= numberOfPages.value) {
                fetchTodos(page);
            }
        };

        const moveToCreatePage = () => {
            router.push({
                name: 'TodoCreate',
            })
        };

        let timeout = null;
        const searchTodo = () => {
            clearTimeout(timeout);
            fetchTodos(1);
        };

        watch(searchText, () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                fetchTodos(1);
            }, 500);
        });

        return {
            searchTodo,
            todos,
            searchText,
            error,
            numberOfPages,
            currentPage,
            fetchTodos,
            toastMessage,
            toastAlertType,
            showToast,
            moveToCreatePage,
            changePage,
            loading,
        };
    }
}
</script>

<style src="@/assets/css/todos.css" scoped></style>