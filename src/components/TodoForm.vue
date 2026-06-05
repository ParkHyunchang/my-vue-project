<template>
    <div v-if="loading">
        Loading..
    </div>
    <form v-else @submit.prevent="onSave" class="todo-form">
        <div class="row">
            <div class="col-12 col-md-6">
                <AppInput label="Title" v-model:title="todo.title" :error="titleError" />
            </div>
            <div v-if="editing" class="col-12 col-md-6">
                <div class="form-group">
                    <label>Status</label>
                    <div>
                        <button class="btn" type="button" :class="todo.done ? 'btn-success' : 'btn-danger'"
                            @click="toggleTodoStatus">
                            {{ todo.done ? 'Completed' : 'Incomplete' }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="col-12 col-md-4">
                <div class="form-group">
                    <label>우선순위</label>
                    <select v-model.number="todo.priority" class="form-control">
                        <option :value="3">🔴 높음</option>
                        <option :value="2">🟡 보통</option>
                        <option :value="1">🟢 낮음</option>
                    </select>
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="form-group">
                    <label>마감일</label>
                    <div class="date-wrap" @click="openDatePicker">
                        <input
                            ref="dueDateInput"
                            type="date"
                            v-model="todo.dueDate"
                            class="form-control date-input"
                        />
                        <span class="date-icon" aria-hidden="true">📅</span>
                        <button
                            v-if="todo.dueDate"
                            type="button"
                            class="date-clear"
                            @click.stop="todo.dueDate = ''"
                            title="마감일 지우기"
                        >×</button>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-4">
                <div class="form-group">
                    <label>카테고리</label>
                    <input type="text" v-model="todo.category" class="form-control"
                        list="todo-category-list" placeholder="예: 업무, 공부, 운동" maxlength="30" />
                    <datalist id="todo-category-list">
                        <option v-for="c in suggestedCategories" :key="c" :value="c" />
                    </datalist>
                </div>
            </div>

            <div class="col-12">
                <div class="form-group">
                    <label>Description</label>
                    <textarea v-model="todo.description" class="form-control" cols="30" rows="8"></textarea>
                </div>
            </div>
        </div>

        <div class="mt-3">
            <button type="submit" class="btn btn-primary">
                {{ editing ? 'Update' : 'Create' }}
            </button>
            <button type="button" class="btn btn-outline-dark ml-2" @click="moveToTodoListPage">
                Cancel
            </button>
        </div>
    </form>
</template>

<script>
import { useRoute, useRouter } from 'vue-router';
import axios from '@/axios';
import { ref, onMounted, watch } from 'vue';
import { useToast } from '@/composables/toast';
import { logger } from '@/utils/logger';
import { apiErrorMessage } from '@/utils/apiError';
import AppInput from '@/components/Input.vue';

const DEFAULT_CATEGORIES = ['업무', '공부', '운동', '집안일', '개인'];

// 신규 작성 중인 내용을 임시 저장하는 키. 세션 만료로 로그인 페이지로 튕기거나
// 실수로 페이지를 벗어나도 작성한 내용이 날아가지 않도록 한다.
const DRAFT_KEY = 'todo_create_draft';

export default {
    components: {
        AppInput,
    },
    props: {
        editing: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const route = useRoute();
        const router = useRouter();
        const todo = ref({
            title: '',
            done: false,
            description: '',
            priority: 2,
            dueDate: '',
            category: '',
        });

        const titleError = ref('');
        const loading = ref(false);
        const dueDateInput = ref(null);
        const suggestedCategories = ref([...DEFAULT_CATEGORIES]);
        const { showToast } = useToast();

        const openDatePicker = () => {
            const el = dueDateInput.value;
            if (el && typeof el.showPicker === 'function') {
                try { el.showPicker(); return; } catch { /* fallthrough */ }
            }
            // showPicker 미지원/실패 시 포커스로 fallback
            el?.focus();
        };

        const todoId = route.params.id;

        const getTodo = async () => {
            loading.value = true;
            try {
                const res = await axios.get(`/api/todos/${todoId}`);
                const data = res.data || {};
                todo.value = {
                    title: data.title || '',
                    done: !!data.done,
                    description: data.description || '',
                    priority: data.priority ?? 2,
                    dueDate: data.dueDate || '',
                    category: data.category || '',
                };
                loading.value = false;
            } catch (error) {
                loading.value = false;
                logger.error('할 일 로드 실패:', error);
                showToast(apiErrorMessage(error, 'Something went wrong'), 'danger');
            }
        };

        const loadCategories = async () => {
            try {
                const res = await axios.get('/api/todos/categories');
                const fromServer = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
                const merged = Array.from(new Set([...fromServer, ...DEFAULT_CATEGORIES]));
                suggestedCategories.value = merged;
            } catch {
                /* 기본값 사용 */
            }
        };

        const toggleTodoStatus = () => {
            todo.value.done = !todo.value.done;
        };

        const moveToTodoListPage = () => {
            router.push('/todos');
        };

        // ---- 임시 저장(draft) 처리: 신규 작성에만 적용 ----
        const saveDraft = () => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(todo.value));
            } catch { /* 저장 실패는 무시 */ }
        };
        const clearDraft = () => {
            try { localStorage.removeItem(DRAFT_KEY); } catch { /* 무시 */ }
        };
        const restoreDraft = () => {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                if (!raw) return;
                const saved = JSON.parse(raw);
                if (saved && typeof saved === 'object') {
                    todo.value = { ...todo.value, ...saved };
                    showToast('이전에 작성하던 내용을 복원했습니다.', 'info');
                }
            } catch { /* 손상된 draft는 무시 */ }
        };

        onMounted(() => {
            loadCategories();
            if (props.editing) {
                getTodo();
            } else {
                restoreDraft();
                // 입력이 바뀔 때마다 임시 저장 (세션 만료/이탈 대비)
                watch(todo, saveDraft, { deep: true });
            }
        });

        const onSave = async () => {
            titleError.value = '';
            if (!todo.value.title.trim()) {
                titleError.value = 'Title is required';
                return;
            }

            try {
                const data = {
                    title: todo.value.title.trim(),
                    done: todo.value.done,
                    description: todo.value.description.trim(),
                    priority: todo.value.priority ?? 2,
                    dueDate: todo.value.dueDate || null,
                    category: todo.value.category ? todo.value.category.trim() : null,
                };

                if (props.editing) {
                    await axios.put(`/api/todos/${todoId}`, data);
                    showToast('Successfully Updated!');
                    moveToTodoListPage();
                } else {
                    await axios.post('/api/todos', data);
                    clearDraft();
                    showToast('Successfully Created!');
                    moveToTodoListPage();
                }
            } catch (error) {
                logger.error('할 일 저장 실패:', error);
                // 401(세션 만료)인 경우 작성 내용은 draft로 보존되어 있으므로 안심시킨다.
                if (error.response?.status === 401) {
                    showToast('세션이 만료되었습니다. 작성 내용은 임시 저장되었으니 다시 로그인 후 등록해주세요.', 'danger');
                } else {
                    showToast(apiErrorMessage(error, '할 일 저장에 실패했습니다.'), 'danger');
                }
            }
        };

        return {
            todo,
            loading,
            dueDateInput,
            suggestedCategories,
            toggleTodoStatus,
            moveToTodoListPage,
            openDatePicker,
            onSave,
            titleError,
        };
    },
};
</script>

<style src="@/assets/css/todos.css" scoped></style>
