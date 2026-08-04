import { useRef, useState, type ChangeEvent } from 'react'
import { mediaUrl, uploadImages } from '../../api/uploads'
import { Button } from './Button'
import { Alert } from './Page'

export function ImageUploader({
  value,
  onChange,
  multiple = false,
  label = 'تصویر',
}: {
  value: string[]
  onChange: (urls: string[]) => void
  multiple?: boolean
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    setUploading(true)
    setError(null)
    try {
      const items = await uploadImages(files)
      const urls = items.map((item: { url: string }) => item.url)
      onChange(multiple ? [...value, ...urls] : urls.slice(0, 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در آپلود')
    } finally {
      setUploading(false)
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative size-20 overflow-hidden rounded-xl border border-line bg-bg-soft"
          >
            <img src={mediaUrl(url)} alt="" className="size-full object-cover" />
            <button
              type="button"
              className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-[10px] text-white"
              onClick={() => removeAt(index)}
            >
              حذف
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'در حال آپلود...' : multiple ? 'افزودن تصویر' : 'انتخاب تصویر'}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      {error ? <Alert>{error}</Alert> : null}
    </div>
  )
}
