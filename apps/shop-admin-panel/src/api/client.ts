const TOKEN_KEY = 'shop_admin_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

function getBaseUrl(): string {
  const base =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    'http://127.0.0.1:5000/api'
  return base.replace(/\/$/, '')
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const message = (data as { message?: unknown }).message
  if (typeof message === 'string') return message
  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join('، ') || fallback
  }
  return fallback
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getStoredToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearStoredToken()
    onUnauthorized?.()
    throw new ApiError('نشست شما منقضی شده است. دوباره وارد شوید.', 401)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    throw new ApiError(
      parseErrorMessage(data, 'خطایی رخ داد. دوباره تلاش کنید.'),
      response.status,
    )
  }

  return data as T
}
