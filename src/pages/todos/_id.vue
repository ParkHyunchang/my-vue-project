<template>
    <div class="page-container">
        <h1>To-Do Page</h1>
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