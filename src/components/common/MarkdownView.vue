<template>
  <div
    class="md-body"
    v-html="html"
  />
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

<style src="@/assets/css/components/common/markdown-view.css" scoped></style>
