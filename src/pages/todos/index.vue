<template>
    <div>
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
        <TodoSimpleForm @todo-added="fetchTodos" />
        <TodoList :todos="todos" @todo-updated="fetchTodos" />
        <hr />
        <nav aria-label="Page navigation example">
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
    </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import TodoList from '@/components/TodoList.vue';
import TodoSimpleForm from '@/components/TodoSimpleForm.vue';
import axios from '@/axios';
import { useToast } from '@/composables/toast';
import { useRouter } from 'vue-router';

export default {
    components: {
        TodoList,
        TodoSimpleForm,
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
            return isNaN(n) || n < 1 ? 1 : n;
        });

        const {
            toastMessage,
            toastAlertType,
            showToast,
            triggerToast
        } = useToast();

        // 서버에서 페이징/검색 적용해서 가져오기
        const fetchTodos = async (page = currentPage.value) => {
            loading.value = true;
            currentPage.value = page;
            try {
                // Spring Boot 백엔드에 맞는 쿼리 파라미터 사용
                const params = {
                    page: page - 1, // Spring Data JPA는 0-base
                    size: limit,
                };
                if (searchText.value) params.q = searchText.value;
                const res = await axios.get('todos', { params });
                todos.value = res.data;
                // X-Total-Count 헤더에서 전체 개수 추출
                const total = res.headers['x-total-count'];
                numberOfTodos.value = total ? parseInt(total) : todos.value.length;
            } catch (err) {
                console.log(err);
                error.value = 'Something went wrong.';
                triggerToast('Something went wrong', 'danger')
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => fetchTodos(1));

        const changePage = (page) => {
            fetchTodos(page);
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

<style>
.todo {
    color: gray;
    text-decoration: line-through;
}
</style>