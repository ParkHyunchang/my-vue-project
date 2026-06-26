import http from '@/axios'

// 타입 힌트 연결 패턴 (JS 파일에서 OpenAPI 생성 타입 참조):
//   1. 해당 api 파일 상단에 @typedef 선언:
//      /** @typedef {import('@/generated/api').components['schemas']['XxxResponse']} XxxResponse */
//   2. 호출 측에서 @type 으로 응답 필드에 붙임:
//      const res = await xxxApi.list()
//      /** @type {XxxResponse[]} */ const items = res.data
export function createResourceApi(basePath) {
  const itemPath = (id) => `${basePath}/${encodeURIComponent(id)}`

  return {
    list(config) {
      return http.get(basePath, config)
    },
    detail(id, config) {
      return http.get(itemPath(id), config)
    },
    create(payload, config) {
      return http.post(basePath, payload, config)
    },
    update(id, payload, config) {
      return http.put(itemPath(id), payload, config)
    },
    remove(id, config) {
      return http.delete(itemPath(id), config)
    },
    swapOrder(a, b) {
      return Promise.all([
        http.put(itemPath(a.id), { ...a, sortOrder: b.sortOrder }),
        http.put(itemPath(b.id), { ...b, sortOrder: a.sortOrder }),
      ])
    },
  }
}
