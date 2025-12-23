<template>
    <div
        class="modal-wrapper"
        @click.self="onBackdropClick"
        @wheel.stop
    >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <slot name="header"></slot>
                    </h5>
                    <button
                        type="button"
                        class="close"
                        :disabled="closeDisabled"
                        :aria-disabled="closeDisabled ? 'true' : 'false'"
                        @click="onCloseClick"
                    >
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <slot name="body"></slot>
                </div>
                <div class="modal-footer">
                    <slot name="footer"></slot>
                </div>

                <div v-if="busy" class="modal-busy-overlay" aria-live="polite" aria-busy="true">
                    <div class="modal-busy-spinner" aria-hidden="true"></div>
                    <div class="modal-busy-text">{{ busyText }}</div>
                </div>
            </div>
        </div>
    </div>
</template>
  
<script>
import { getCurrentInstance, onMounted, onUnmounted } from 'vue';
export default {
    props: {
        closeOnBackdrop: {
            type: Boolean,
            default: true,
        },
        closeOnEsc: {
            type: Boolean,
            default: true,
        },
        // 업로드/파일 선택 등으로 닫힘을 막아야 하는 경우 사용
        closeDisabled: {
            type: Boolean,
            default: false,
        },
        // 업로드 진행 등 "busy" 구간에 모달 내부를 고정 오버레이로 덮어 깜빡임 체감 최소화
        busy: {
            type: Boolean,
            default: false,
        },
        busyText: {
            type: String,
            default: '업로드 중...',
        },
    },
    setup(props) {
        const { emit } = getCurrentInstance();
        let savedBodyOverflow = '';
        let savedBodyPaddingRight = '';
        let savedHtmlOverflow = '';
        let savedHtmlPaddingRight = '';
        
        const onClose = () => {
            if (props.closeDisabled) return;
            emit('close');
        }

        const onCloseClick = () => {
            onClose();
        };

        const onBackdropClick = () => {
            if (props.closeDisabled) return;
            if (!props.closeOnBackdrop) return;
            onClose();
        };


        // ESC 키로 모달 닫기
        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                if (props.closeDisabled) return;
                if (!props.closeOnEsc) return;
                onClose();
            }
        }

        const getScrollbarWidth = () =>
            Math.max(0, window.innerWidth - document.documentElement.clientWidth);

        const lockScroll = () => {
            savedBodyOverflow = document.body.style.overflow;
            savedBodyPaddingRight = document.body.style.paddingRight;
            savedHtmlOverflow = document.documentElement.style.overflow;
            savedHtmlPaddingRight = document.documentElement.style.paddingRight;

            const scrollbarWidth = getScrollbarWidth();
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
                document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
            }

            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        };

        const unlockScroll = () => {
            document.body.style.overflow = savedBodyOverflow;
            document.body.style.paddingRight = savedBodyPaddingRight;
            document.documentElement.style.overflow = savedHtmlOverflow;
            document.documentElement.style.paddingRight = savedHtmlPaddingRight;
        };

        onMounted(() => {
            lockScroll();

            document.addEventListener('keydown', handleKeydown);
            // document에 휠 이벤트 등록하지 않고, 모달 wrapper에만 등록
        });

        onUnmounted(() => {
            unlockScroll();
            document.removeEventListener('keydown', handleKeydown);
        });

        return {
            onClose,
            onCloseClick,
            onBackdropClick,
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
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
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
    position: relative;
}

.modal-busy-overlay {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    pointer-events: all;
}

.modal-busy-spinner {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 4px solid rgba(0, 0, 0, 0.12);
    border-top-color: rgba(233, 30, 99, 0.9);
    animation: modalBusySpin 0.9s linear infinite;
}

.modal-busy-text {
    font-size: 0.95rem;
    color: #444;
    font-weight: 600;
}

@keyframes modalBusySpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch; /* iOS 스크롤 부드럽게 */
    scrollbar-width: thin; /* Firefox */
    scrollbar-color: #ccc #f1f1f1; /* Firefox */
}

/* Webkit 브라우저용 스크롤바 스타일 */
.modal-body::-webkit-scrollbar {
    width: 8px;
}

.modal-body::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
    background: #999;
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
        height: 100vh;   /* 폴백 */
        height: 100dvh;
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
    }
    .modal-dialog {
        width: 100vw;
        margin: 0;
        height: 100vh;   /* 폴백 */
        height: 100dvh;
        min-height: 100vh;
        min-height: 100dvh;
        max-height: 100vh;
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