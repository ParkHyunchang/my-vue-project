<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1>채팅 히스토리</h1>
        <p>전체 채팅 세션 내역을 확인합니다.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="sessions.length === 0" class="loading-state">채팅 기록이 없습니다.</div>

    <template v-else>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>세션 ID</th>
              <th>사용자</th>
              <th>메시지 수</th>
              <th class="hide-mobile">마지막 활동</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="session in sessions" :key="session.sessionKey">
              <tr class="session-row" @click="toggleSession(session.sessionKey)">
                <td class="session-key">{{ session.sessionKey.slice(0, 8) }}...</td>
                <td>{{ session.username || '익명' }}</td>
                <td>{{ session.messageCount }}개</td>
                <td class="hide-mobile">{{ formatDate(session.lastActivity) }}</td>
                <td class="expand-icon">{{ expandedKey === session.sessionKey ? '▲' : '▼' }}</td>
              </tr>
              <tr v-if="expandedKey === session.sessionKey" class="messages-row">
                <td colspan="5">
                  <div v-if="messagesLoading" class="messages-loading">불러오는 중...</div>
                  <div v-else class="messages-list thin-scrollbar">
                    <div
                      v-for="(msg, i) in expandedMessages"
                      :key="i"
                      class="msg-item"
                      :class="msg.role"
                    >
                      <span class="msg-role">{{ msg.role === 'user' ? '사용자' : 'AI' }}</span>
                      <pre class="msg-content">{{ msg.content }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script>
import axios from '@/axios'

export default {
  name: 'AdminChatHistory',
  data() {
    return {
      sessions: [],
      loading: true,
      error: '',
      expandedKey: null,
      expandedMessages: [],
      messagesLoading: false,
    }
  },
  mounted() {
    this.loadSessions()
  },
  methods: {
    loadSessions() {
      this.loading = true
      this.error = ''
      axios.get('/api/admin/chat/sessions')
        .then(res => { this.sessions = res.data })
        .catch(err => {
          if (err.response?.status === 403) {
            this.$store.dispatch('toast/showToast', { message: '접근 권한이 없습니다.', type: 'error' })
            this.$router.push('/')
          } else {
            this.error = '데이터를 불러오지 못했습니다.'
          }
        })
        .finally(() => { this.loading = false })
    },
    toggleSession(sessionKey) {
      if (this.expandedKey === sessionKey) {
        this.expandedKey = null
        this.expandedMessages = []
        return
      }
      this.expandedKey = sessionKey
      this.expandedMessages = []
      this.messagesLoading = true
      axios.get(`/api/admin/chat/sessions/${sessionKey}/messages`)
        .then(res => { this.expandedMessages = res.data })
        .catch(() => { this.expandedMessages = [] })
        .finally(() => { this.messagesLoading = false })
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
  },
}
</script>

<style src="@/assets/css/pages/admin-chat-history.css" scoped></style>
