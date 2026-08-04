import { buildQuery, toQuery } from '../lib/query'
import type { Paginated } from '../types/common'
import type {
  Order,
  OrdersQuery,
  OrdersStats,
  UpdateOrderStatusPayload,
  UpdatePaymentStatusPayload,
} from '../types/order'
import { apiRequest } from './client'

export function fetchOrders(query: OrdersQuery = {}) {
  return apiRequest<Paginated<Order>>(`/admin/orders${buildQuery(toQuery(query))}`)
}

export function fetchOrdersStats() {
  return apiRequest<OrdersStats>('/admin/orders/stats')
}

export function fetchOrder(id: string) {
  return apiRequest<Order>(`/admin/orders/${id}`)
}

export function updateOrderStatus(id: string, payload: UpdateOrderStatusPayload) {
  return apiRequest<Order>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateOrderPaymentStatus(
  id: string,
  payload: UpdatePaymentStatusPayload,
) {
  return apiRequest<Order>(`/admin/orders/${id}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
