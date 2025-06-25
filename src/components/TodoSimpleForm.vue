<template>
    <form @submit.prevent="onSubmit">
        <div class="d-flex">
            <div class="flex-grow-1 mr-2">
                <input
                    class="form-control"
                    type="text" 
                    v-model="todo"
                    placeholder="Type new to-do"
                >
            </div>
            <div>
                <button 
                    class="btn btn-primary"
                    type="submit"
                >
                    Add
                </button>
            </div>
        </div>
        <div v-show="hasError" style="color: red">
            This field cannot be empty
        </div>
    </form>
</template>

<script>
import { ref } from 'vue';
import axios from '@/axios';

export default {
    emits: ['todo-added'],
    setup(props, { emit }) {
        const todo = ref('');
        const hasError = ref(false);
        const onSubmit = async () => {
            if (todo.value === '') {
                hasError.value = true;
            } else {
                try {
                    await axios.post('todos', {
                        title: todo.value,
                        completed: false,
                        body: ''
                    });
                    emit('todo-added');
                    hasError.value = false;
                    todo.value = '';
                } catch (e) {
                    hasError.value = true;
                }
            }
        };

        return {
            todo,
            hasError,
            onSubmit,
        };
    }
}
</script>

<style></style>