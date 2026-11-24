import http from '@/axios'

const RISK_PATH = '/api/kiwoom/us/auto-trade/risk'

/** Whole-account USD drawdown policy. GET is read-only; mutations never start buying. */
export const kiwoomUsRiskApi = {
  get: () => http.get(RISK_PATH),
  activate: () => http.post(`${RISK_PATH}/activate`, { confirmAllHoldings: true, confirmCapitalFlows: true }),
  requireCapitalFlowReview: () => http.post(`${RISK_PATH}/capital-flow-review`, { required: true }),
  confirmCapitalFlow: ({ reference, amountUsd }) => http.post(`${RISK_PATH}/capital-flow`, {
    reference, amountUsd, confirm: true,
  }),
}
