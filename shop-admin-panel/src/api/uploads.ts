import { getStoredToken } from './client'

function apiBase(): string {
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    'http://127.0.0.1:3000/api'
  )
}

/** Backend origin that serves `/uploads` (never the Vite frontend). */
function mediaOrigin(): string {
  const explicit = import.meta.env.VITE_MEDIA_BASE_URL as string | undefined
  if (explicit) return explicit.replace(/\/$/, '')

  const base = apiBase()
  if (base.startsWith('/')) {
    return 'http://127.0.0.1:3000'
  }
  return base.replace(/\/api\/?$/, '')
}

/** Absolute URL to a file stored on the backend (`/uploads/...`). */
export function mediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${mediaOrigin()}${normalized}`
}

export interface UploadItem {
  url: string
  filename: string
  originalName: string
  size: number
  mimeType: string
}

export async function uploadImages(files: File[]): Promise<UploadItem[]> {
  if (!files.length) return []

  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }

  const headers = new Headers()
  const token = getStoredToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBase().replace(/\/$/, '')}/admin/uploads`, {
    method: 'POST',
    headers,
    body: form,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join('، ')
          : 'آپلود تصویر ناموفق بود'
    throw new Error(message)
  }

  const data = (await response.json()) as { items: UploadItem[] }
  return data.items
}
