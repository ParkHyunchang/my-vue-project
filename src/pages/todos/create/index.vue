<template>
  <div class="page-container todo-editor-page">
    <header class="todo-editor-header">
      <h1>새 할 일</h1>
      <p>해야 할 일과 우선순위, 마감일을 정리하세요.</p>
    </header>
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
