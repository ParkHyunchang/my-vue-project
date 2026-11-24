import http from '@/axios';
const ACCOUNTS_PATH = '/api/portfolio/accounts';
/** Manual accounts only. A broker label does not create a broker connection. */
export const fetchPortfolioAccounts = () => http.get(ACCOUNTS_PATH);
export const createPortfolioAccount = payload => http.post(ACCOUNTS_PATH, payload);
export const updatePortfolioAccount = (id, payload) => http.put(`${ACCOUNTS_PATH}/${encodeURIComponent(id)}`, payload);
/** holdingsPath is supplied by the authenticated accounts response. */
export const fetchManualHoldings = (holdingsPath, config) => http.get(holdingsPath, config);
export const createManualHolding = (holdingsPath, payload, config) => http.post(holdingsPath, payload, config);
