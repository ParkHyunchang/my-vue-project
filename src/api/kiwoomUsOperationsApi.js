import axios from '@/axios'

const BASE = '/api/kiwoom/us/auto-trade'

// Recent automatic-trading proposals only; not the broker's complete order book.
export const getUsOperationOrders = () => axios.get(`${BASE}/proposals`)
