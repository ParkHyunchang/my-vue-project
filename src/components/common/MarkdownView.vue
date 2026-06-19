<template>
  <div class="md-body" v-html="html"></div>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

export default {
  name: 'MarkdownView',
  props: {
    text: { type: String, default: '' },
  },
  computed: {
    html() {
      const raw = marked.parse(this.text || '')
      return DOMPurify.sanitize(raw)
    },
  },
}
</script>

<style scoped>
.md-body {
  color: #d8d8e0;
  font-size: 0.9rem;
  line-height: 1.7;
  word-break: break-word;
}

.md-body :deep(h1),
.md-body :deep(h2),
.md-body :deep(h3),
.md-body :deep(h4) {
  color: #f0ece4;
  font-weight: 700;
  line-height: 1.35;
  margin: 1.3em 0 0.6em;
}
.md-body :deep(h1) { font-size: 1.3rem; border-bottom: 1px solid #33333f; padding-bottom: 0.3em; }
.md-body :deep(h2) { font-size: 1.15rem; border-bottom: 1px solid #2a2a36; padding-bottom: 0.25em; }
.md-body :deep(h3) { font-size: 1.02rem; }
.md-body :deep(h4) { font-size: 0.95rem; color: #c9c2e6; }
.md-body :deep(*:first-child) { margin-top: 0; }

.md-body :deep(p) { margin: 0.6em 0; }

.md-body :deep(strong) { color: #f0ece4; font-weight: 700; }
.md-body :deep(em) { color: #c9c2e6; }
.md-body :deep(a) { color: #9d92ff; text-decoration: underline; }

.md-body :deep(ul),
.md-body :deep(ol) { margin: 0.5em 0; padding-left: 1.4em; }
.md-body :deep(li) { margin: 0.25em 0; }

.md-body :deep(blockquote) {
  margin: 0.8em 0;
  padding: 0.4em 0.9em;
  border-left: 3px solid #7c6fff;
  background: rgba(124, 111, 255, 0.07);
  color: #b9b2e6;
}

.md-body :deep(code) {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.84em;
  background: #0e0e15;
  border: 1px solid #2a2a36;
  border-radius: 4px;
  padding: 0.1em 0.35em;
}
.md-body :deep(pre) {
  background: #0e0e15;
  border: 1px solid #2a2a36;
  border-radius: 8px;
  padding: 0.8em;
  overflow-x: auto;
  margin: 0.8em 0;
}
.md-body :deep(pre code) { border: none; background: none; padding: 0; }

/* 표 — 재무/비교 표 가독성 핵심 */
.md-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.9em 0;
  font-size: 0.85rem;
  display: block;
  overflow-x: auto;
}
.md-body :deep(th),
.md-body :deep(td) {
  border: 1px solid #2f2f3d;
  padding: 0.5em 0.7em;
  text-align: left;
  white-space: nowrap;
}
.md-body :deep(th) {
  background: rgba(124, 111, 255, 0.12);
  color: #e8e4f5;
  font-weight: 600;
}
.md-body :deep(tr:nth-child(even) td) { background: rgba(255, 255, 255, 0.02); }

.md-body :deep(hr) { border: none; border-top: 1px solid #2a2a36; margin: 1.2em 0; }
</style>
