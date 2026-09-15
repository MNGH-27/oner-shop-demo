import type {
  MongoId,
  OrderStatus,
  PaginationQuery,
  PaymentMethod,
  PaymentStatus,
} from './common'

export interface OrderItem {
  product: MongoId
  name: string
  price: number
  quantity: number
  image?: string
  color?: string
  size?: string
}

export interface ShippingAddress {
  fullName: string
  phone: string
  province: string
  city: string
  addressLine: string
  postalCode: string
}

export interface OrderUserRef {
  _id: MongoId
  id?: MongoId
  email: string
  firstName: string
  lastName: string
  phone?: string
  fullName?: string
}

export interface Order {
  _id: MongoId
  orderNumber: string
  user: MongoId | OrderUserRef
  items: OrderItem[]
  status: OrderStatus
  shippingAddress: ShippingAddress
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  subtotal: number
  shippingCost: number
  couponCode?: string | null
  couponDiscount?: number
  totalAmount: number
  notes?: string
  deliveredAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface OrdersStats {
  totalOrders: number
  byStatus: Record<OrderStatus, number>
  byPaymentStatus: Record<PaymentStatus, number>
  paidRevenue: number
  paidOrders: number
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus
  notes?: string
}

export interface UpdatePaymentStatusPayload {
  paymentStatus: PaymentStatus
}

export interface OrdersQuery extends PaginationQuery {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  userId?: MongoId
  search?: string
}
