<template>
    <List :items="todos">
        <template #default="{ item }">
            <div class="todo-row" @click="moveToPage(item.id)">
                <input
                    class="todo-check"
                    type="checkbox"
                    :checked="!!item.done"
                    @change="toggleTodo(item)"
                    @click.stop
                />
                <div class="todo-body">
                    <div class="todo-line-1">
                        <span class="todo-priority" :class="'pri-' + priorityKey(item.priority)" :title="priorityLabel(item.priority)">
                            {{ priorityIcon(item.priority) }}
                        </span>
                        <span class="todo-title" :class="{ 'todo-done': item.done }">{{ item.title }}</span>
                    </div>
                    <div v-if="item.category || item.dueDate" class="todo-line-2">
                        <span v-if="item.category" class="todo-badge cat">#{{ item.category }}</span>
                        <span
                            v-if="item.dueDate"
                            class="todo-badge due"
                            :class="dueStateClass(item)"
                        >
                            {{ dueLabel(item) }}
                        </span>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm todo-del" @click.stop="openModal(item.id)">
                    삭제
                </button>
            </div>
        </template>
    </List>

    <teleport to="#modal">
        <Modal v-if="showModal" @close="closeModal" @delete="deleteTodo" />
    </teleport>
</template>

<script>
import { useRouter } from 'vue-router';
import Modal from '@/components/DeleteModal.vue';
import { ref } from 'vue';
import List from '@/components/List.vue';
import axios from '@/axios';
import { useToast } from '@/composables/toast';
import { apiErrorMessage } from '@/utils/apiError';

export default {
    components: {
        Modal,
        List
    },
    props: {
        todos: {
            type: Array,
            required: true
        }
    },
    emits: ['todo-updated'],
    setup(props, { emit }) {
        const router = useRouter();
        const { showToast } = useToast();
        const showModal = ref(false);
        const todoDeleteId = ref(null);

        const toggleTodo = async (item) => {
            try {
                await axios.put(`/api/todos/${item.id}`, {
                    ...item,
                    done: item.done === null ? true : !item.done
                });
                emit('todo-updated');
            } catch (e) {
                showToast(apiErrorMessage(e, '할 일 상태 변경에 실패했습니다.'), 'danger');
            }
        };

        const openModal = (id) => {
            todoDeleteId.value = id;
            showModal.value = true;
        };

        const closeModal = () => {
            todoDeleteId.value = null;
            showModal.value = false;
        };

        const deleteTodo = async () => {
            try {
                await axios.delete(`/api/todos/${todoDeleteId.value}`);
                emit('todo-updated');
            } catch (e) {
                showToast(apiErrorMessage(e, '할 일 삭제에 실패했습니다.'), 'danger');
            }
            showModal.value = false;
            todoDeleteId.value = null;
        };

        const moveToPage = (todoId) => {
            router.push({
                name: 'Todo',
                params: {
                    id: todoId
                }
            });
        };

        // ── 우선순위 ────────────────────────────
        const priorityKey = (p) => {
            if (p === 3) return 'high';
            if (p === 1) return 'low';
            return 'mid';
        };
        const priorityIcon = (p) => {
            if (p === 3) return '🔴';
            if (p === 1) return '🟢';
            return '🟡';
        };
        const priorityLabel = (p) => {
            if (p === 3) return '우선순위 높음';
            if (p === 1) return '우선순위 낮음';
            return '우선순위 보통';
        };

        // ── 마감일 ────────────────────────────
        const diffDays = (dueDateStr) => {
            if (!dueDateStr) return null;
            const d = new Date(dueDateStr);
            d.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return Math.round((d - today) / (1000 * 60 * 60 * 24));
        };
        const dueLabel = (item) => {
            const d = diffDays(item.dueDate);
            if (d === null) return '';
            if (item.done) return `📅 ${item.dueDate}`;
            if (d === 0) return '📅 오늘 마감';
            if (d === 1) return '📅 내일 마감';
            if (d > 1) return `📅 D-${d}`;
            return `📅 ${-d}일 지남`;
        };
        const dueStateClass = (item) => {
            if (item.done) return 'due-done';
            const d = diffDays(item.dueDate);
            if (d === null) return '';
            if (d < 0) return 'due-overdue';
            if (d <= 1) return 'due-soon';
            return '';
        };

        return {
            toggleTodo,
            deleteTodo,
            moveToPage,
            showModal,
            openModal,
            closeModal,
            priorityKey,
            priorityIcon,
            priorityLabel,
            dueLabel,
            dueStateClass,
        };
    }
}
</script>

<style src="@/assets/css/todos.css" scoped></style>
