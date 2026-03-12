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
  
<style src="@/assets/css/modal.css" scoped></style>