<template>
    <div class="modal-wrapper" @click.self="onClose">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <slot name="header"></slot>
                    </h5>
                    <button type="button" class="close">
                        <span @click="onClose">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <slot name="body"></slot>
                </div>
                <div class="modal-footer">
                    <slot name="footer"></slot>
                </div>
            </div>
        </div>
    </div>
</template>
  
<script>
import { getCurrentInstance, onMounted, onUnmounted } from 'vue';
export default {
    setup() {
        const { emit } = getCurrentInstance();
        
        const onClose = () => {
            emit('close');
        }

        // 모달이 열릴 때 body 스크롤 방지
        const disableScroll = () => {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${window.scrollY}px`;
        }

        // 모달이 닫힐 때 body 스크롤 복원
        const enableScroll = () => {
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }

        // ESC 키로 모달 닫기
        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        onMounted(() => {
            disableScroll();
            document.addEventListener('keydown', handleKeydown);
        });

        onUnmounted(() => {
            enableScroll();
            document.removeEventListener('keydown', handleKeydown);
        });

        return {
            onClose,
        }
    }
}
</script>
  
<style scoped>
.modal-wrapper {
    position: fixed;
    z-index: 99999;  /* 매우 높은 z-index 값 */
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px); /* 배경 블러 효과 */
}

.modal-dialog {
    width: 90%;
    max-width: 600px;
    margin: 0 auto;
}

.modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
}

.modal-header {
    padding: 1rem;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    margin: 0;
    font-size: 1.25rem;
}

.close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    color: #666;
    min-width: 2rem;
    min-height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.close:hover {
    color: #333;
    background-color: rgba(0, 0, 0, 0.05);
}

.close:active {
    background-color: rgba(0, 0, 0, 0.1);
}

.modal-body {
    padding: 1rem;
    max-height: 70vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* iOS 스크롤 부드럽게 */
}

.modal-footer {
    padding: 1rem;
    border-top: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

/* 모바일 반응형 스타일 */
@media (max-width: 768px) {
    .modal-wrapper {
        padding: 0;
        align-items: stretch;
        height: 100dvh;
        min-height: 100dvh;
        display: flex;
    }
    .modal-dialog {
        width: 100vw;
        margin: 0;
        height: 100dvh;
        min-height: 100dvh;
        max-height: 100dvh;
        display: flex;
        align-items: stretch;
    }
    .modal-content {
        border-radius: 0;
        height: 100dvh;
        min-height: 0;
        max-height: 100dvh;
        display: flex;
        flex-direction: column;
    }
    .modal-header {
        padding: 0.75rem;
        flex-shrink: 0;
        position: relative;
    }
    .modal-title {
        font-size: 1.1rem;
        padding-right: 3rem; /* X 버튼 공간 확보 */
    }
    .close {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.25rem;
        padding: 0.5rem;
        min-width: 2.5rem;
        min-height: 2.5rem;
    }
    .modal-body {
        flex: 1 1 auto;
        overflow-y: auto;
        max-height: none;
        min-height: 0;
        -webkit-overflow-scrolling: touch;
    }
    .modal-footer {
        padding: 0.75rem;
        flex-direction: column;
        gap: 0.75rem;
        flex-shrink: 0;
    }
    .modal-footer > div {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
    }
}
</style>