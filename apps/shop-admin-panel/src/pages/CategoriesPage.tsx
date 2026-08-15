import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoryTree,
  updateCategory,
} from '../api/categories'
import { ApiError } from '../api/client'
import { mediaUrl } from '../api/uploads'
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  TableShell,
} from '../components/ui/Page'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { ImageUploader } from '../components/ui/ImageUploader'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { entityId, parentId } from '../lib/id'
import { formatDate } from '../lib/labels'
import type { Category, CategoryTreeNode, CreateCategoryPayload } from '../types/category'
import { categorySchema, validationErrors, type FieldErrors } from '../lib/validation'

type FormState = {
  name: string
  description: string
  image: string
  parent: string
  isActive: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  image: '',
  parent: '',
  isActive: true,
}

function flattenTree(
  nodes: CategoryTreeNode[],
  depth = 0,
): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = []
  for (const node of nodes) {
    const prefix = depth === 0 ? '' : `${'── '.repeat(depth)}`
    result.push({
      id: entityId(node),
      label: depth === 0 ? node.name : `${prefix}${node.name}`,
    })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

function countDescendants(node: CategoryTreeNode): number {
  if (!node.children?.length) return 0
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  )
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deleteTarget, setDeleteTarget] = useState<Category | CategoryTreeNode | null>(null)

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      onlyActive: onlyActive || undefined,
    }),
    [page, search, onlyActive],
  )

  const listQuery = useQuery({
    queryKey: ['categories', query],
    queryFn: () => fetchCategories(query),
    enabled: view === 'list',
  })

  const treeQuery = useQuery({
    queryKey: ['categories-tree', onlyActive],
    queryFn: () => fetchCategoryTree(onlyActive),
    enabled: view === 'tree' || modalOpen,
  })

  const parentOptions = useMemo(
    () => flattenTree(treeQuery.data ?? []),
    [treeQuery.data],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateCategoryPayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image: form.image || undefined,
        parent: form.parent || undefined,
        isActive: form.isActive,
      }
      if (editing) {
        return updateCategory(entityId(editing), payload)
      }
      return createCategory(payload)
    },
    onSuccess: async () => {
      setModalOpen(false)
      const wasEditing = Boolean(editing)
      setEditing(null)
      setForm(emptyForm)
      setFormError(null)
      toast.success(wasEditing ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی اضافه شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['categories-tree'] }),
      ])
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'خطا در ذخیره دسته‌بندی'
      setFormError(message)
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      setDeleteTarget(null)
      toast.success('دسته‌بندی حذف شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['categories-tree'] }),
      ])
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'خطا در حذف دسته‌بندی')
    },
  })

  function openCreate(parentIdValue = '') {
    setEditing(null)
    setForm({ ...emptyForm, parent: parentIdValue })
    setFormError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(category: Category | CategoryTreeNode) {
    setEditing(category as Category)
    setForm({
      name: category.name,
      description: category.description ?? '',
      image: category.image ?? '',
      parent: parentId(category.parent) ?? '',
      isActive: category.isActive,
    })
    setFormError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function submitCategory() {
    const validation = categorySchema.safeParse(form)
    const errors = validationErrors(validation)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    saveMutation.mutate()
  }

  function renderTreeRows(nodes: CategoryTreeNode[], depth = 0): ReactNode {
    return nodes.map((node, index) => {
      const id = entityId(node)
      const hasChildren = Boolean(node.children?.length)
      const isCollapsed = collapsed[id]
      const childCount = countDescendants(node)
      const isLast = index === nodes.length - 1

      return (
        <div key={id} className="relative">
          <div
            className={`group flex flex-wrap items-center gap-3 border-b border-line py-3 pe-4 ${
              depth === 0 ? 'bg-surface' : 'bg-bg/40'
            }`}
            style={{ paddingInlineStart: `${1 + depth * 1.75}rem` }}
          >
            {/* hierarchy guide */}
            {depth > 0 ? (
              <span
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-line"
                style={{ insetInlineStart: `${0.85 + (depth - 1) * 1.75}rem` }}
                aria-hidden
              />
            ) : null}

            <button
              type="button"
              className={`grid size-7 shrink-0 place-items-center rounded-lg border text-xs font-bold transition-colors ${
                hasChildren
                  ? 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/15'
                  : 'border-transparent bg-bg-soft text-muted'
              }`}
              onClick={() => hasChildren && toggleCollapse(id)}
              disabled={!hasChildren}
              aria-label={isCollapsed ? 'باز کردن' : 'بستن'}
            >
              {hasChildren ? (isCollapsed ? '+' : '−') : '•'}
            </button>

            {node.image ? (
              <img
                src={mediaUrl(node.image)}
                alt=""
                className="size-11 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-bg-soft text-sm font-bold text-muted">
                {node.name.slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{node.name}</span>
                {depth === 0 ? (
                  <Badge tone="info">والد</Badge>
                ) : (
                  <Badge tone="neutral">فرزند · سطح {depth.toLocaleString('fa-IR')}</Badge>
                )}
                {hasChildren ? (
                  <Badge tone="warning">
                    {childCount.toLocaleString('fa-IR')} زیر‌دسته
                  </Badge>
                ) : null}
              </div>
              {node.description ? (
                <p className="mt-0.5 mb-0 truncate text-xs text-muted">
                  {node.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={node.isActive ? 'success' : 'danger'}>
                {node.isActive ? 'فعال' : 'غیرفعال'}
              </Badge>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => openCreate(id)}
              >
                زیر‌دسته
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(node)}>
                ویرایش
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setDeleteTarget(node)}
              >
                حذف
              </Button>
            </div>
          </div>

          {hasChildren && !isCollapsed ? (
            <div
              className={isLast && depth > 0 ? '' : ''}
            >
              {renderTreeRows(node.children, depth + 1)}
            </div>
          ) : null}
        </div>
      )
    })
  }

  return (
    <div>
      <PageHeader
        title="دسته‌بندی‌ها"
        description="ساختار درختی والد و فرزند دسته‌های فروشگاه"
        action={
          <Button type="button" onClick={() => openCreate()}>
            دسته جدید
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:flex-row lg:items-end">
        <Field label="جستجو">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="نام دسته"
            disabled={view === 'tree'}
          />
        </Field>
        <Field label="نمایش">
          <Select
            value={view}
            onChange={(e) => setView(e.target.value as 'tree' | 'list')}
          >
            <option value="tree">درختواره (والد / فرزند)</option>
            <option value="list">لیست ساده</option>
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
        {view === 'list' ? (
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
        ) : null}
      </div>

      {view === 'tree' ? (
        <>
          {treeQuery.isLoading ? <Spinner /> : null}
          {treeQuery.isError ? (
            <Alert>
              {treeQuery.error instanceof ApiError
                ? treeQuery.error.message
                : 'خطا در دریافت درخت دسته‌ها'}
            </Alert>
          ) : null}
          {treeQuery.data && treeQuery.data.length === 0 ? (
            <EmptyState
              title="درختی برای نمایش نیست"
              actionLabel="ایجاد دسته"
              onAction={() => openCreate()}
            />
          ) : null}
          {treeQuery.data && treeQuery.data.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-bg-soft/70 px-4 py-2.5 text-xs text-muted">
                <span>
                  {treeQuery.data.length.toLocaleString('fa-IR')} دستهٔ ریشه
                </span>
                <span>روی − / + بزنید تا زیر‌دسته‌ها جمع/باز شوند</span>
              </div>
              {renderTreeRows(treeQuery.data)}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {listQuery.isLoading ? <Spinner /> : null}
          {listQuery.isError ? (
            <Alert>
              {listQuery.error instanceof ApiError
                ? listQuery.error.message
                : 'خطا در دریافت دسته‌ها'}
            </Alert>
          ) : null}
          {listQuery.data && listQuery.data.items.length === 0 ? (
            <EmptyState
              title="دسته‌بندی‌ای نیست"
              actionLabel="ایجاد دسته"
              onAction={() => openCreate()}
            />
          ) : null}
          {listQuery.data && listQuery.data.items.length > 0 ? (
            <>
              <TableShell>
                <thead>
                  <tr className="border-b border-line bg-bg-soft/60 text-right">
                    <th className="px-4 py-3 font-semibold">نام</th>
                    <th className="px-4 py-3 font-semibold">نوع</th>
                    <th className="px-4 py-3 font-semibold">والد</th>
                    <th className="px-4 py-3 font-semibold">وضعیت</th>
                    <th className="px-4 py-3 font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {listQuery.data.items.map((category) => {
                    const id = entityId(category)
                    const hasParent = Boolean(category.parent)
                    const parentName =
                      category.parent && typeof category.parent !== 'string'
                        ? category.parent.name
                        : null
                    return (
                      <tr key={id} className="border-b border-line last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {category.image ? (
                              <img
                                src={mediaUrl(category.image)}
                                alt=""
                                className="size-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="grid size-10 place-items-center rounded-lg bg-bg-soft text-sm font-bold text-muted">
                                {category.name.slice(0, 1)}
                              </div>
                            )}
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasParent ? (
                            <Badge tone="neutral">فرزند</Badge>
                          ) : (
                            <Badge tone="info">والد</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {parentName ? (
                            <span className="rounded-lg bg-bg-soft px-2 py-1 text-sm">
                              {parentName}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={category.isActive ? 'success' : 'danger'}>
                            {category.isActive ? 'فعال' : 'غیرفعال'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => openCreate(id)}
                            >
                              زیر‌دسته
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(category)}
                            >
                              ویرایش
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteTarget(category)}
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
                page={listQuery.data.meta.page}
                totalPages={listQuery.data.meta.totalPages}
                total={listQuery.data.meta.total}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={submitCategory}
            >
              {saveMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="نام" error={fieldErrors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </Field>
          <Field label="توضیحات" error={fieldErrors.description}>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              aria-invalid={Boolean(fieldErrors.description)}
            />
          </Field>
          <ImageUploader
            label="تصویر دسته"
            value={form.image ? [form.image] : []}
            onChange={(urls) => setForm((f) => ({ ...f, image: urls[0] ?? '' }))}
          />
          <Field label="دسته والد" hint="اگر انتخاب شود، این دسته به‌عنوان فرزند ثبت می‌شود">
            <Select
              value={form.parent}
              onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
            >
              <option value="">بدون والد (دسته ریشه)</option>
              {parentOptions
                .filter((opt) => opt.id !== (editing ? entityId(editing) : ''))
                .map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
            </Select>
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
          {formError ? <Alert>{formError}</Alert> : null}
          <p className="m-0 text-xs text-muted">
            ایجاد: {editing ? formatDate(editing.createdAt) : '—'}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف دسته‌بندی"
        message={`دسته «${deleteTarget?.name ?? ''}» حذف شود؟ در صورت داشتن زیر‌دسته، حذف ممکن نیست.`}
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
