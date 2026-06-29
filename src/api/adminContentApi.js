import { createResourceApi } from './resourceApi'

// OpenAPI 타입 참조 — `npm run gen:api` 실행 후 src/generated/api.d.ts 가 생성되면 활성화됨.
// VSCode 자동완성 전용이며 런타임 동작에는 영향 없음.
// 사용 예: /** @type {Career[]} */ const list = (await adminCareerApi.list()).data
/** @typedef {import('@/generated/api').components['schemas']['Career']} Career */
/** @typedef {import('@/generated/api').components['schemas']['Experience']} Experience */
/** @typedef {import('@/generated/api').components['schemas']['PortfolioSkill']} PortfolioSkill */

export const adminCareerApi = createResourceApi('/api/admin/career')
export const adminExperienceApi = createResourceApi('/api/admin/experience')
export const adminPortfolioSkillApi = createResourceApi('/api/admin/portfolio-skills')
