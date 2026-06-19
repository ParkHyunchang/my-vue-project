<template>
  <div class="chat-page">

    <!-- 사이드바 (항상 표시) -->
    <aside class="chat-sidebar" :class="{ 'sidebar--open': sidebarOpen }">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="startNewChat">+ 새 대화</button>
      </div>
      <div class="session-list thin-scrollbar" data-lenis-prevent>
        <div
          v-for="s in sessions"
          :key="s.sessionKey"
          class="session-item"
          :class="{ active: s.sessionKey === sessionKey }"
          @click="switchSession(s.sessionKey)"
        >
          <span class="session-title">{{ s.title || '새 대화' }}</span>
          <span class="session-date">{{ formatDate(s.lastActivity) }}</span>
        </div>
        <div v-if="sessions.length === 0 && !initialLoading" class="session-empty">대화 없음</div>
      </div>
    </aside>

    <!-- 채팅 영역 -->
    <div class="chat-main">
      <div class="chat-header">
        <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="chat-header-text">
          <h2 class="chat-title">AI Chat</h2>
          <p class="chat-subtitle">Claude AI와 대화하세요</p>
        </div>
      </div>

      <div class="messages thin-scrollbar" ref="messagesEl" data-lenis-prevent>
        <!-- 새 채팅 환영 화면 -->
        <div v-if="!sessionKey && !historyLoading" class="welcome-screen">
          <h1 class="welcome-title">
            {{ username ? `안녕하세요, ${username}님` : '무엇이든 물어보세요' }}
          </h1>
          <p class="welcome-subtitle">Claude AI와 대화해보세요</p>
        </div>
        <!-- 히스토리 로딩 중 -->
        <div v-else-if="historyLoading" class="empty-state">불러오는 중...</div>
        <!-- 메시지 목록 -->
        <template v-else>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="message"
            :class="msg.role"
          >
            <div class="message__bubble">
              <pre class="message__text">{{ msg.content }}<span v-if="msg.streaming" class="stream-cursor">▌</span></pre>
              <span v-if="msg.streaming && !msg.content" class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="!username" class="chat-login-prompt">
        <span>채팅을 사용하려면 로그인이 필요합니다.</span>
        <button class="login-btn" type="button" @click="goToLogin">로그인</button>
      </div>
      <form v-else class="chat-input-area" @submit.prevent="send">
        <textarea
          v-model="input"
          class="chat-input thin-scrollbar"
          placeholder="메시지를 입력하세요..."
          rows="1"
          @keydown.enter.exact.prevent="send"
          @input="autoResize"
          ref="inputEl"
          :disabled="loading || historyLoading"
        />
        <button class="send-btn" type="submit" :disabled="loading || historyLoading || !input.trim()">
          전송
        </button>
      </form>
    </div>

    <!-- 모바일 사이드바 오버레이 -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />
  </div>
</template>

<script>
import axios from '@/axios'

export default {
  name: 'ChatPage',
  data() {
    return {
      messages: [],
      input: '',
      loading: false,
      historyLoading: false,
      initialLoading: true,
      sessionKey: '',
      sessions: [],
      sidebarOpen: false,
    }
  },
  computed: {
    username() {
      return this.$store.getters['auth/user']?.username || ''
    },
  },
  mounted() {
    if (this.username) {
      this.loadUserSessions()
    } else {
      this.initialLoading = false
    }
  },
  methods: {
    // ── 세션 로드 ──────────────────────────────────────────────

    loadUserSessions() {
      axios.get(`/api/chat/sessions/${this.username}`)
        .then(res => { this.sessions = res.data })
        .catch(() => {})
        .finally(() => { this.initialLoading = false })
    },

    // ── UUID 생성 (구형 브라우저 폴백 포함) ────────────────────

    generateUUID() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    },

    // ── 세션 관리 ──────────────────────────────────────────────

    startNewChat() {
      this.sessionKey = ''
      this.messages = []
      this.historyLoading = false
      this.sidebarOpen = false
    },

    switchSession(key) {
      this.sessionKey = key
      this.sidebarOpen = false
      this.loadHistory()
    },

    // ── 히스토리 로드 ──────────────────────────────────────────

    loadHistory() {
      if (!this.sessionKey) return
      this.historyLoading = true
      axios.get(`/api/chat/history/${this.sessionKey}`)
        .then(res => {
          this.messages = res.data.map(r => ({ role: r.role, content: r.content }))
          this.$nextTick(() => this.scrollToBottom())
        })
        .catch(() => {})
        .finally(() => { this.historyLoading = false })
    },

    // ── 메시지 전송 (SSE 스트리밍) ─────────────────────────────
    // 백엔드 /api/chat/stream 이 토큰을 SSE 이벤트(delta/done/error)로 흘려보냄.
    // 어시스턴트 메시지를 빈 상태로 먼저 push 한 뒤 delta가 올 때마다 content에 append.

    async send() {
      const text = this.input.trim()
      if (!text || this.loading) return

      if (!this.sessionKey) {
        this.sessionKey = this.generateUUID()
      }

      this.messages.push({ role: 'user', content: text })
      const assistantIndex = this.messages.length
      this.messages.push({ role: 'assistant', content: '', streaming: true })

      const userContent = text
      this.input = ''
      this.$nextTick(() => this.autoResize())
      this.loading = true
      this.scrollToBottom()

      try {
        await this.streamChat(userContent, assistantIndex)
      } catch (e) {
        if (!this.messages[assistantIndex].content) {
          this.messages[assistantIndex].content = '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
        }
      } finally {
        this.messages[assistantIndex].streaming = false
        this.refreshSessions()
        this.loading = false
        this.$nextTick(() => this.scrollToBottom())
      }
    },

    async streamChat(userContent, assistantIndex) {
      const url = `${process.env.VUE_APP_API_URL || ''}/api/chat/stream`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ sessionKey: this.sessionKey, content: userContent }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let currentEvent = null

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE는 빈 줄(\n\n)로 이벤트가 끝나지만, 라인 단위로 누적 파싱하는 게 더 안전
        let newlineIdx
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).replace(/\r$/, '')
          buffer = buffer.slice(newlineIdx + 1)

          if (line === '') { currentEvent = null; continue }
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (!data) continue
            this.handleSseData(currentEvent, data, assistantIndex)
          }
        }
      }
    },

    handleSseData(eventName, data, assistantIndex) {
      let parsed
      try { parsed = JSON.parse(data) } catch { return }

      if (eventName === 'delta' && parsed.text) {
        this.messages[assistantIndex].content += parsed.text
        this.scrollToBottom()
      } else if (eventName === 'error') {
        // 중간에 에러가 나면 지금까지 받은 부분 응답 뒤에 에러 메시지를 덧붙임
        const err = parsed.message || '오류가 발생했습니다.'
        const m = this.messages[assistantIndex]
        m.content = m.content ? `${m.content}\n\n${err}` : err
      }
    },

    refreshSessions() {
      if (this.username) {
        axios.get(`/api/chat/sessions/${this.username}`)
          .then(res => { this.sessions = res.data })
      }
    },

    // ── UI 유틸 ────────────────────────────────────────────────

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messagesEl
        if (el) el.scrollTop = el.scrollHeight
      })
    },

    autoResize() {
      const el = this.$refs.inputEl
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    },

    goToLogin() {
      this.$router.push('/login')
    },

    formatDate(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    },
  },
}
</script>

<style scoped>
.chat-page {
  display: flex;
  height: calc(100dvh - 68px);
  overflow: hidden;
}

/* ── 사이드바 ────────────────────────────────── */
.chat-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--card-border, #2a2a2a);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface, #1a1a1a);
}

.sidebar-header {
  padding: 0.75rem;
  border-bottom: 1px solid var(--card-border, #2a2a2a);
  flex-shrink: 0;
}

.new-chat-btn {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid var(--card-border, #2a2a2a);
  border-radius: 6px;
  color: var(--accent, #7c6fff);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.new-chat-btn:hover {
  background: var(--accent-dim, rgba(124,111,255,0.1));
  border-color: var(--accent, #7c6fff);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0;
}

.session-item {
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  border-radius: 6px;
  margin: 0 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  transition: background 0.15s;
}

.session-item:hover {
  background: var(--accent-dim, rgba(124,111,255,0.1));
}

.session-item.active {
  background: var(--accent-dim, rgba(124,111,255,0.1));
  border-left: 2px solid var(--accent, #7c6fff);
  padding-left: calc(0.75rem - 2px);
}

.session-title {
  font-size: 0.8rem;
  color: var(--text-primary, #eee);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item.active .session-title {
  color: var(--accent, #7c6fff);
}

.session-date {
  font-size: 0.7rem;
  color: var(--text-muted, #888);
}

.session-empty {
  padding: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted, #888);
  text-align: center;
}

/* ── 채팅 메인 ───────────────────────────────── */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.chat-header {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--card-border, #2a2a2a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sidebar-toggle {
  background: transparent;
  border: 1px solid var(--card-border, #2a2a2a);
  border-radius: 6px;
  color: var(--text-secondary, #aaa);
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
  display: none;
}

.chat-header-text { display: flex; flex-direction: column; }

.chat-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent, #7c6fff);
  margin: 0;
}

.chat-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted, #888);
  margin: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 0.6rem;
  text-align: center;
  padding: 2rem;
}

.welcome-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #eee);
  margin: 0;
}

.welcome-subtitle {
  font-size: 0.95rem;
  color: var(--text-muted, #888);
  margin: 0;
}

.message { display: flex; }
.message.user { justify-content: flex-end; }
.message.assistant { justify-content: flex-start; }

.message__bubble {
  max-width: 72%;
  padding: 0.7rem 0.95rem;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.message.user .message__bubble {
  background: var(--accent, #c9a96e);
  color: var(--text-on-accent, #0b0b10);
}

.message.assistant .message__bubble {
  background: var(--surface-2, #1c1c28);
  border: 1px solid var(--card-border, rgba(201,169,110,0.12));
  color: #f0ece4;
}

.message.assistant .message__text {
  color: #f0ece4;
}

.message__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.stream-cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--accent, #7c6fff);
  animation: stream-blink 1s steps(2, start) infinite;
}

@keyframes stream-blink {
  to { visibility: hidden; }
}

.loading-dots { display: inline-flex; gap: 2px; }

.loading-dots span {
  animation: blink 1.2s infinite;
  color: var(--text-muted, #888);
  font-size: 1.4rem;
  line-height: 1;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}

.chat-input-area {
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--card-border, #2a2a2a);
  flex-shrink: 0;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: 1px solid var(--card-border, #2a2a2a);
  border-radius: 6px;
  color: var(--text-primary, #eee);
  font-size: 0.9rem;
  padding: 0.6rem 0.85rem;
  resize: none;
  outline: none;
  line-height: 1.5;
  transition: border-color 0.2s;
}

.chat-input:focus { border-color: var(--accent, #7c6fff); }
.chat-input::placeholder { color: var(--text-muted, #888); }

.send-btn {
  background: var(--accent, #7c6fff);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.1rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.send-btn:not(:disabled):hover { opacity: 0.85; }

.chat-login-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--card-border, #2a2a2a);
  flex-shrink: 0;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.login-btn {
  background: var(--accent, #7c6fff);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.45rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.login-btn:hover { opacity: 0.85; }

/* ── 모바일 ──────────────────────────────────── */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

@media (max-width: 640px) {
  .sidebar-toggle {
    display: block;
  }

  .chat-sidebar {
    position: fixed;
    top: 68px;
    left: 0;
    bottom: 0;
    z-index: 100;
    width: 260px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .chat-sidebar.sidebar--open {
    transform: translateX(0);
  }

  .chat-header {
    padding: 0.65rem 0.9rem;
  }

  .messages {
    padding: 0.9rem 1rem;
  }

  .message__bubble {
    max-width: 85%;
  }

  .chat-input-area {
    padding: 0.65rem 0.9rem;
  }

  .welcome-title {
    font-size: 1.3rem;
  }

  .welcome-subtitle {
    font-size: 0.875rem;
  }

  .welcome-screen {
    padding: 1.5rem 1rem;
  }
}
</style>
