export type UserRole = 'admin' | 'customer'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export interface LoginPayload {
  email: string
  password: string
}
