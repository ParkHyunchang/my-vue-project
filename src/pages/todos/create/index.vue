<template>
  <div class="page-container">
    <h1>Create Todo</h1>
    <TodoForm />
  </div>
</template>

<script>
import TodoForm from '@/components/TodoForm.vue';

export default {
    components: {
        TodoForm
    }
}
</script>

<style src="@/assets/css/todos.css" scoped></style>