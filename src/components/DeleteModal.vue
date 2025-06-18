<template>
    <Modal>
        <template #title>
            Delete Todo
        </template>
        <template #body>
            Are you sure you want to delete this todo?
        </template>
        <template #footer>
            <button type="button" class="btn btn-secondary" @click="onClose">
                Close
            </button>
            <button type="button" class="btn btn-danger" @click="onDelete">Delete</button>
        </template>
    </Modal>
</template>
  
<script>
import Modal from '@/components/Modal.vue';
import { getCurrentInstance } from 'vue';
export default {
    components: {
        Modal
    },
    setup() {
        const { emit } = getCurrentInstance();
        const onClose = () => {
            emit('close');
        }

        const onDelete = () => {
            emit('delete');
        }

        return {
            onClose,
            onDelete
        }
    }
}
</script>
  
<style></style>