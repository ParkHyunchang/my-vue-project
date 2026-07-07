<template>
  <div class="form-group">
    <label>{{ label }}</label>
    <input
      :value="title"
      @input="onInput"
      type="text"
      class="form-control"
    >
    <div
      v-if="error"
      class="text-red"
    >
      {{ error }}
    </div>
  </div>
</template>

<script>
export default {
    props: {
        label: {
            type: String,
            required: true
        },
        error: {
            type: String,
            default: ''
        },
        title: {
            type: String,
            required: true
        }
    },
    emits: ['update:title'],
    setup(props, { emit }) {
        const onInput = (e) => {
            emit('update:title', e.target.value);
        };

        return {
            onInput
        }
    }
}
</script>

<style src="@/assets/css/todos.css" scoped></style>