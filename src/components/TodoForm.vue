<template>
    <div v-if="loading">
        Loading..
    </div>
    <form v-else @submit.prevent="onSave">
        <div class="row">
            <div class="col-6">
                <BaseInput label="Title" v-model:title="todo.title" :error="titleError" />
            </div>
            <div v-if="editing" class="col-6">
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
            <div class="col-12">
                <div class="form-group">
                    <label>Description</label>
                    <textarea v-model="todo.description" class="form-control" cols="30" rows="10"></textarea>
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
    <transition name="fade">
        <Toast v-if="showToast" :message="toastMessage" :type="toastAlertType" />
    </transition>
</template>
  
<script>
import { useRoute, useRouter } from 'vue-router';
/* eslint-disable no-console */
import axios from '@/axios';
import { ref, computed } from 'vue';
import _ from 'lodash';
import Toast from '@/components/Toast.vue';
import { useToast } from '@/composables/toast';
import BaseInput from '@/components/Input.vue';

export default {
    components: {
        Toast,
        BaseInput
    },
    props: {
        editing: {
            type: Boolean,
            default: false
        }
    },
    setup(props) {
        const route = useRoute();
        const router = useRouter();
        const todo = ref({
            title: '',
            done: false,
            description: ''
        });

        const titleError = ref('');
        const originalTodo = ref(null);
        const loading = ref(false);
        const {
            toastMessage,
            toastAlertType,
            showToast
        } = useToast();

        const todoId = route.params.id;

        const getTodo = async () => {
            loading.value = true;
            try {
                const res = await axios.get(`todos/${todoId}`);
                todo.value = { ...res.data };
                originalTodo.value = { ...res.data };
                loading.value = false;
            } catch (error) {
                loading.value = false;
                console.error('할 일 저장 실패:', error);
                showToast('Something went wrong', 'danger');
            }
        };

        const todoUpdated = computed(() => {
            return !_.isEqual(todo.value, originalTodo.value);
        });

        const toggleTodoStatus = () => {
            todo.value.done = !todo.value.done;
        };

        const moveToTodoListPage = () => {
            router.push({
                name: 'Todos'
            });
        };

        if (props.editing) {
            getTodo();
        }

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
                    description: todo.value.description.trim()
                };

                if (props.editing) {
                    await axios.put(`todos/${todoId}`, data);
                    showToast('Successfully Updated!');
                    moveToTodoListPage();
                } else {
                    await axios.post('todos', data);
                    showToast('Successfully Created!');
                    moveToTodoListPage();
                }
            } catch (error) {
                console.error('할 일 저장 실패:', error);
                showToast('Something went wrong', 'danger');
            }
        };

        return {
            todo,
            loading,
            toggleTodoStatus,
            moveToTodoListPage,
            onSave,
            todoUpdated,
            showToast,
            toastMessage,
            toastAlertType,
            titleError
        };
    }
}
</script>

<style src="@/assets/css/todos.css" scoped></style>