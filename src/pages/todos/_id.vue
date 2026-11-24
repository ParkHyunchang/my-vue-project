<template>
  <div class="page-container todo-editor-page">
    <header class="todo-editor-header">
      <h1>할 일 상세</h1>
      <p>진행 상태와 내용을 확인하고 수정하세요.</p>
    </header>
    <TodoForm :editing="true" />
  </div>
</template>
  
<script>
import TodoForm from '@/components/TodoForm.vue';

export default {
    components: {
        TodoForm
    },
}
</script>
  
<style src="@/assets/css/todos.css" scoped></style>
