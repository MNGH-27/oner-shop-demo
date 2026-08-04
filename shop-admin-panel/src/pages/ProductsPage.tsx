import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchCategories } from '../api/categories'
import { ApiError } from '../api/client'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  setProductStock,
  updateProduct,
  updateProductPrice,
} from '../api/products'
import { fetchSettings } from '../api/settings'
import { Alert, Badge, EmptyState, PageHeader, Pagination, Spinner, TableShell } from '../components/ui/Page'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { ImageUploader } from '../components/ui/ImageUploader'
import { toast } from 'sonner'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { mediaUrl } from '../api/uploads'
import { categoryName, entityId } from '../lib/id'
import { formatDate, formatNumber, formatPrice } from '../lib/labels'
import type {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from '../types/product'

type FormState = {
  name: string
  description: string
  category: string
  images: string[]
  price: string
  shippingCost: string
  stock: string
  lowStockThreshold: string
  isActive: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  category: '',
  images: [],
  price: '',
  shippingCost: '0',
  stock: '0',
  lowStockThreshold: '',
  isActive: true,
}

function parseThreshold(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return Number(trimmed)
}

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [priceTarget, setPriceTarget] = useState<Product | null>(null)
  const [stockTarget, setStockTarget] = useState<Product | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [stockForm, setStockForm] = useState({ stock: '', lowStockThreshold: '' })
  const [sideError, setSideError] = useState<string | null>(null)

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      category: categoryFilter || undefined,
      onlyActive: onlyActive || undefined,
    }),
    [page, search, categoryFilter, onlyActive],
  )

  const productsQuery = useQuery({
    queryKey: ['products', query],
    queryFn: () => fetchProducts(query),
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories-options'],
    queryFn: () => fetchCategories({ limit: 100 }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const payload: UpdateProductPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          images: form.images,
          shippingCost: Number(form.shippingCost) || 0,
          lowStockThreshold: parseThreshold(form.lowStockThreshold),
          isActive: form.isActive,
        }
        return updateProduct(entityId(editing), payload)
      }

      const payload: CreateProductPayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        images: form.images,
        price: Number(form.price) || 0,
        shippingCost: Number(form.shippingCost) || 0,
        stock: Number(form.stock) || 0,
        lowStockThreshold: parseThreshold(form.lowStockThreshold),
        isActive: form.isActive,
      }
      return createProduct(payload)
    },
    onSuccess: async () => {
      setModalOpen(false)
      const wasEditing = Boolean(editing)
      setEditing(null)
      setForm(emptyForm)
      setFormError(null)
      toast.success(wasEditing ? 'محصول ویرایش شد' : 'محصول اضافه شد')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'خطا در ذخیره محصول'
      setFormError(message)
      toast.error(message)
    },
  })

  const priceMutation = useMutation({
    mutationFn: () =>
      updateProductPrice(entityId(priceTarget!), {
        price: Number(priceValue),
      }),
    onSuccess: async () => {
      setPriceTarget(null)
      setSideError(null)
      toast.success('قیمت بروزرسانی شد')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'خطا در بروزرسانی قیمت'
      setSideError(message)
      toast.error(message)
    },
  })

  const stockMutation = useMutation({
    mutationFn: async () => {
      return setProductStock(entityId(stockTarget!), {
        stock: Number(stockForm.stock) || 0,
        lowStockThreshold: parseThreshold(stockForm.lowStockThreshold),
      })
    },
    onSuccess: async () => {
      setStockTarget(null)
      setSideError(null)
      toast.success('موجودی بروزرسانی شد')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'خطا در بروزرسانی موجودی'
      setSideError(message)
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      setDeleteTarget(null)
      toast.success('محصول حذف شد')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'خطا در حذف محصول')
    },
  })

  async function openCreate() {
    setEditing(null)
    setFormError(null)
    try {
      const settings = await fetchSettings()
      setForm({
        ...emptyForm,
        shippingCost: String(settings.defaultShippingCost ?? 0),
      })
    } catch {
      setForm(emptyForm)
    }
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({
      name: product.name,
      description: product.description ?? '',
      category:
        typeof product.category === 'string'
          ? product.category
          : entityId(product.category),
      images: product.images ?? [],
      price: String(product.price),
      shippingCost: String(product.shippingCost ?? 0),
      stock: String(product.stock),
      lowStockThreshold:
        product.lowStockThreshold === null ||
        product.lowStockThreshold === undefined
          ? ''
          : String(product.lowStockThreshold),
      isActive: product.isActive,
    })
    setFormError(null)
    setModalOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="محصولات"
        description="مدیریت کالا، قیمت و موجودی"
        action={
          <Button type="button" onClick={() => void openCreate()}>
            محصول جدید
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-4 lg:items-end">
        <Field label="جستجو">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="نام یا توضیحات"
          />
        </Field>
        <Field label="دسته">
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setPage(1)
              setCategoryFilter(e.target.value)
            }}
          >
            <option value="">همه</option>
            {categoriesQuery.data?.items.map((cat) => (
              <option key={entityId(cat)} value={entityId(cat)}>
                {cat.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="فقط فعال">
          <Select
            value={onlyActive ? 'true' : 'false'}
            onChange={(e) => {
              setPage(1)
              setOnlyActive(e.target.value === 'true')
            }}
          >
            <option value="false">خیر</option>
            <option value="true">بله</option>
          </Select>
        </Field>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
        >
          اعمال فیلتر
        </Button>
      </div>

      {productsQuery.isLoading ? <Spinner /> : null}
      {productsQuery.isError ? (
        <Alert>
          {productsQuery.error instanceof ApiError
            ? productsQuery.error.message
            : 'خطا در دریافت محصولات'}
        </Alert>
      ) : null}

      {productsQuery.data && productsQuery.data.items.length === 0 ? (
        <EmptyState title="محصولی یافت نشد" actionLabel="ایجاد محصول" onAction={() => void openCreate()} />
      ) : null}

      {productsQuery.data && productsQuery.data.items.length > 0 ? (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line bg-bg-soft/60 text-right">
                <th className="px-4 py-3 font-semibold">محصول</th>
                <th className="px-4 py-3 font-semibold">دسته</th>
                <th className="px-4 py-3 font-semibold">قیمت</th>
                <th className="px-4 py-3 font-semibold">هزینه ارسال</th>
                <th className="px-4 py-3 font-semibold">موجودی</th>
                <th className="px-4 py-3 font-semibold">وضعیت</th>
                <th className="px-4 py-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {productsQuery.data.items.map((product) => {
                const id = entityId(product)
                const thumb = product.images?.[0]
                return (
                  <tr key={id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <img
                            src={mediaUrl(thumb)}
                            alt=""
                            className="size-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="size-12 rounded-lg bg-bg-soft" />
                        )}
                        <div className="font-medium">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{categoryName(product.category)}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatPrice(product.shippingCost)}
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatNumber(product.stock)}</div>
                      {product.lowStockThreshold != null ? (
                        <div className="mt-0.5 text-xs text-muted">
                          اعلان از {formatNumber(product.lowStockThreshold)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={product.isActive ? 'success' : 'danger'}>
                        {product.isActive ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(product)}>
                          ویرایش
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setPriceTarget(product)
                            setPriceValue(String(product.price))
                            setSideError(null)
                          }}
                        >
                          قیمت
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setStockTarget(product)
                            setStockForm({
                              stock: String(product.stock),
                              lowStockThreshold:
                                product.lowStockThreshold == null
                                  ? ''
                                  : String(product.lowStockThreshold),
                            })
                            setSideError(null)
                          }}
                        >
                          موجودی
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(product)}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableShell>
          <Pagination
            page={productsQuery.data.meta.page}
            totalPages={productsQuery.data.meta.totalPages}
            total={productsQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? 'ویرایش محصول' : 'محصول جدید'}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="دسته">
            <Select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              required
            >
              <option value="">انتخاب کنید</option>
              {categoriesQuery.data?.items.map((cat) => (
                <option key={entityId(cat)} value={entityId(cat)}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </Field>
          {!editing ? (
            <>
              <Field label="قیمت (تومان)">
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="مثلاً 1850000"
                  dir="ltr"
                />
              </Field>
              <Field label="موجودی">
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  dir="ltr"
                />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-xl bg-bg-soft px-3 py-2 text-sm text-muted">
              قیمت فعلی: {formatPrice(editing.price)} — موجودی:{' '}
              {formatNumber(editing.stock)} (از دکمه‌های جداگانه تغییر دهید)
            </div>
          )}
          <Field
            label="آستانه اعلان موجودی"
            hint="وقتی موجودی به این عدد برسد (یا کمتر شود)، در تلگرام اطلاع داده می‌شود. خالی = بدون اعلان."
          >
            <Input
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) =>
                setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))
              }
              placeholder="مثلاً ۵"
              dir="ltr"
            />
          </Field>
          <Field label="هزینه ارسال (تومان)">
            <Input
              type="number"
              min={0}
              value={form.shippingCost}
              onChange={(e) => setForm((f) => ({ ...f, shippingCost: e.target.value }))}
              dir="ltr"
            />
          </Field>
          <Field label="وضعیت">
            <Select
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))
              }
            >
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="توضیحات">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ImageUploader
              label="تصاویر محصول"
              multiple
              value={form.images}
              onChange={(images) => setForm((f) => ({ ...f, images }))}
            />
          </div>
        </div>
        {formError ? (
          <div className="mt-3">
            <Alert>{formError}</Alert>
          </div>
        ) : null}
        {editing ? (
          <p className="mt-3 mb-0 text-xs text-muted">
            آخرین بروزرسانی: {formatDate(editing.updatedAt)}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(priceTarget)}
        title={`قیمت — ${priceTarget?.name ?? ''}`}
        onClose={() => setPriceTarget(null)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setPriceTarget(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={priceMutation.isPending}
              onClick={() => priceMutation.mutate()}
            >
              {priceMutation.isPending ? '...' : 'ذخیره قیمت'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="قیمت (تومان)">
            <Input
              type="number"
              min={0}
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              dir="ltr"
            />
          </Field>
          {priceValue !== '' ? (
            <p className="m-0 text-sm text-muted">
              نمایش: {formatPrice(Number(priceValue) || 0)}
            </p>
          ) : null}
          {sideError ? <Alert>{sideError}</Alert> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(stockTarget)}
        title={`موجودی — ${stockTarget?.name ?? ''}`}
        onClose={() => setStockTarget(null)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setStockTarget(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={stockMutation.isPending}
              onClick={() => stockMutation.mutate()}
            >
              {stockMutation.isPending ? '...' : 'ذخیره موجودی'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="موجودی" hint="تعداد فعلی کالا در انبار">
            <Input
              type="number"
              min={0}
              value={stockForm.stock}
              onChange={(e) => setStockForm((f) => ({ ...f, stock: e.target.value }))}
              dir="ltr"
            />
          </Field>
          <Field
            label="آستانه اعلان موجودی"
            hint="وقتی موجودی به این عدد برسد، پیام تلگرام ارسال می‌شود. خالی = بدون اعلان."
          >
            <Input
              type="number"
              min={0}
              value={stockForm.lowStockThreshold}
              onChange={(e) =>
                setStockForm((f) => ({ ...f, lowStockThreshold: e.target.value }))
              }
              placeholder="مثلاً ۵"
              dir="ltr"
            />
          </Field>
          {sideError ? <Alert>{sideError}</Alert> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف محصول"
        message={`محصول «${deleteTarget?.name ?? ''}» حذف شود؟`}
        confirmLabel="حذف"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(entityId(deleteTarget))
        }}
      />
    </div>
  )
}
