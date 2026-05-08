<template>
    <List :items="todos">
        <template #default="{ item }">
            <div class="card-body p-2 d-flex align-items-center" style="cursor: pointer" @click="moveToPage(item.id)">
                <div class="flex-grow-1">
                    <input class="ml-2 mr-2" type="checkbox" :checked="item.done" @change="toggleTodo(item)" @click.stop>
                    <span :class="{ todo: item.done }">
                        {{ item.title }}
                    </span>
                </div>
                <div>
                    <button class="btn btn-danger btn-sm" @click.stop="openModal(item.id)">
                        Delete
                    </button>
                </div>
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

        return {
            toggleTodo,
            deleteTodo,
            moveToPage,
            showModal,
            openModal,
            closeModal,
        };
    }
}
</script>
  
<style src="@/assets/css/todos.css" scoped></style>