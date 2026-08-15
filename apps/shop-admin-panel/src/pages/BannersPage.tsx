import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { createBanner, deleteBanner, fetchBanners, updateBanner } from '../api/banners'
import { mediaUrl } from '../api/uploads'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { ImageUploader } from '../components/ui/ImageUploader'
import { Modal } from '../components/ui/Modal'
import { Alert, PageHeader, Spinner } from '../components/ui/Page'
import { bannerSchema, validationErrors, type FieldErrors } from '../lib/validation'
import type { Banner, BannerPayload } from '../types/banner'

const emptyForm: BannerPayload = { title: '', subtitle: '', image: '', isActive: true }

export function BannersPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BannerPayload>(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const query = useQuery({ queryKey: ['banners'], queryFn: fetchBanners })
  const save = useMutation({
    mutationFn: () => editing ? updateBanner(editing, form) : createBanner(form),
    onSuccess: async () => {
      toast.success(editing ? 'بنر ویرایش شد' : 'بنر اضافه شد')
      closeModal()
      await queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
    onError: () => toast.error('ذخیره بنر انجام نشد'),
  })
  const remove = useMutation({
    mutationFn: deleteBanner,
    onSuccess: async () => {
      toast.success('بنر حذف شد')
      await queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
  })

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(item: Banner) {
    setEditing(item._id)
    setForm({ title: item.title, subtitle: item.subtitle ?? '', image: item.image, isActive: item.isActive })
    setFieldErrors({})
    setModalOpen(true)
  }

  function submitBanner() {
    const errors = validationErrors(bannerSchema.safeParse(form))
    setFieldErrors(errors)
    if (!Object.keys(errors).length) save.mutate()
  }

  if (query.isLoading) return <Spinner />

  return (
    <div>
      <PageHeader
        title="بنرهای سایت"
        description="تصویر و متن بنرهای نمایشی صفحه اصلی Oner را مدیریت کنید."
        action={<Button onClick={openCreate}>بنر جدید</Button>}
      />
      {query.isError ? <Alert>دریافت بنرها انجام نشد</Alert> : (
        <div className="grid gap-4 md:grid-cols-2">
          {query.data?.map((item) => (
            <article key={item._id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <img src={mediaUrl(item.image)} alt={item.title} className="aspect-[16/7] w-full object-cover" />
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-base">{item.title}</h2>
                    {item.subtitle ? <p className="mb-0 mt-1 text-sm text-muted">{item.subtitle}</p> : null}
                  </div>
                  <span className={`rounded-lg border px-3 py-1.5 text-sm font-extrabold ${item.isActive ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                    {item.isActive ? 'در حال نمایش' : 'نمایش داده نمی‌شود'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>ویرایش</Button>
                  <Button size="sm" variant="danger" onClick={() => remove.mutate(item._id)}>حذف</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={modalOpen}
        title={editing ? 'ویرایش بنر' : 'بنر جدید'}
        onClose={closeModal}
        wide
        footer={<><Button variant="ghost" onClick={closeModal}>انصراف</Button><Button disabled={save.isPending} onClick={submitBanner}>{save.isPending ? 'در حال ذخیره...' : 'ذخیره بنر'}</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان" error={fieldErrors.title}>
            <Input aria-invalid={Boolean(fieldErrors.title)} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="زیرعنوان" error={fieldErrors.subtitle}>
            <Input aria-invalid={Boolean(fieldErrors.subtitle)} value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            نمایش بنر در سایت
          </label>
          <div className="sm:col-span-2">
            <ImageUploader label="تصویر بنر" value={form.image ? [form.image] : []} onChange={(images) => setForm({ ...form, image: images[0] ?? '' })} />
            {fieldErrors.image ? <span className="mt-1.5 block text-xs font-medium text-danger">{fieldErrors.image}</span> : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}
