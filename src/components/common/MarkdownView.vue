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

const hasTableContent = (line) => {
  if (!isTableRowLine(line) || isSeparatorLine(line)) return false
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .some((cell) => cell.trim().length > 0)
}

/**
 * AI가 생성한 표에서 GFM 헤더 구분선(|---|---|)이 누락되면 marked가 표로 인식하지 못하고
 * 파이프 문자가 그대로 노출되는 문단으로 렌더링된다. 구분선이 빠진 표 블록에 한해 보정한다.
 */
function repairMarkdownTables(text) {
  if (!text) return text
  const lines = String(text)
    .split('\n')
    // A few providers occasionally prepend a table divider to the next heading.  That makes the
    // heading part of the table on mobile, so recover the heading before table repair.
    .map((line) => line.replace(/^[|:\-\s]{3,}(?=#{1,6}\s)/, ''))
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

  // Keep only populated table rows.  Empty rows and repeated divider rows contain no diagnosis
  // data, but marked renders each of them as a full-width row, which caused the long stack of
  // horizontal lines seen in the mobile report.
  const normalized = []
  for (let i = 0; i < out.length;) {
    if (!isTableRowLine(out[i])) {
      normalized.push(out[i])
      i += 1
      continue
    }

    const tableLines = []
    while (i < out.length && isTableRowLine(out[i])) {
      tableLines.push(out[i])
      i += 1
    }
    const contentRows = tableLines.filter(hasTableContent)
    if (contentRows.length < 2) {
      // A title-only table has no usable rows. Keep its title as normal text rather than creating
      // an empty table with dozens of visual separators.
      if (contentRows.length === 1) normalized.push(contentRows[0])
      continue
    }

    normalized.push(contentRows[0])
    normalized.push(`|${' --- |'.repeat(countCells(contentRows[0]))}`)
    normalized.push(...contentRows.slice(1))
  }
  return normalized.join('\n')
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
