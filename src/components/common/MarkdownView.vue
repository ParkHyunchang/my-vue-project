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

const isTableRowLine = (line) => {
  const t = line.trim()
  return t.startsWith('|') && t.endsWith('|') && t.length > 1
}

const isSeparatorLine = (line) => /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/.test(line.trim())

const countCells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').length

/**
 * AI가 생성한 표에서 GFM 헤더 구분선(|---|---|)이 누락되면 marked가 표로 인식하지 못하고
 * 파이프 문자가 그대로 노출되는 문단으로 렌더링된다. 구분선이 빠진 표 블록에 한해 보정한다.
 */
function repairMarkdownTables(text) {
  if (!text) return text
  const lines = String(text).split('\n')
  const out = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const prevIsRow = i > 0 && isTableRowLine(lines[i - 1])
    if (isTableRowLine(line) && !prevIsRow) {
      out.push(line)
      if (i + 1 < lines.length && isTableRowLine(lines[i + 1]) && !isSeparatorLine(lines[i + 1])) {
        out.push(`|${' --- |'.repeat(countCells(line))}`)
      }
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

export default {
  name: 'MarkdownView',
  props: {
    text: { type: String, default: '' },
  },
  computed: {
    html() {
      const raw = marked.parse(repairMarkdownTables(this.text || ''))
      return DOMPurify.sanitize(raw)
    },
  },
}
</script>

<style src="@/assets/css/components/common/markdown-view.css" scoped></style>
