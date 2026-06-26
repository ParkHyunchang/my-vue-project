export function nextSortOrder(items, field = 'sortOrder') {
  if (!Array.isArray(items) || items.length === 0) return 0
  return Math.max(...items.map(item => Number(item?.[field]) || 0)) + 1
}

export function hasDuplicateSortOrder(items, sortOrder, currentId = null, field = 'sortOrder') {
  const targetOrder = Number(sortOrder)
  return items.some(item =>
    Number(item?.[field]) === targetOrder &&
    (currentId == null || item.id !== currentId)
  )
}

export function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function linesToJsonArray(text) {
  return JSON.stringify(
    String(text || '')
      .split('\n')
      .map(value => value.trim())
      .filter(Boolean)
  )
}

export function csvToJsonArray(text) {
  return JSON.stringify(
    String(text || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  )
}
