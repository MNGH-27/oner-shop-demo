import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrders } from '../api/orders'
import {
  createUser,
  deleteUser,
  fetchUsers,
  fetchUsersStats,
  setUserActive,
  updateUser,
} from '../api/users'
import { ApiError } from '../api/client'
import { Alert, Badge, EmptyState, PageHeader, Pagination, Spinner, StatCard, TableShell } from '../components/ui/Page'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { toast } from 'sonner'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { entityId } from '../lib/id'
import { formatDate, formatPrice, orderStatusLabels, roleLabels } from '../lib/labels'
import type { UserRole } from '../types/common'
import type { CreateUserPayload, UpdateUserPayload, User } from '../types/user'
import { userSchema, validationErrors, type FieldErrors } from '../lib/validation'

type FormState = {
  password: string
  firstName: string
  lastName: string
  phone: string
  role: UserRole
  isActive: boolean
}

const emptyForm: FormState = {
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'customer',
  isActive: true,
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [ordersTarget, setOrdersTarget] = useState<User | null>(null)

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      role: role || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'true',
    }),
    [page, search, role, activeFilter],
  )

  const usersQuery = useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query),
  })

  const statsQuery = useQuery({
    queryKey: ['users-stats'],
    queryFn: fetchUsersStats,
  })

  const userOrdersQuery = useQuery({
    queryKey: ['user-orders', ordersTarget ? entityId(ordersTarget) : ''],
    queryFn: () => fetchOrders({ userId: entityId(ordersTarget!), limit: 100 }),
    enabled: Boolean(ordersTarget),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const payload: UpdateUserPayload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          role: form.role,
          isActive: form.isActive,
        }
        if (form.password.trim()) payload.password = form.password.trim()
        return updateUser(entityId(editing), payload)
      }
      const payload: CreateUserPayload = {
        password: form.password.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        role: form.role,
        isActive: form.isActive,
      }
      return createUser(payload)
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editing)
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      setFormError(null)
      toast.success(wasEditing ? 'کاربر ویرایش شد' : 'کاربر جدید اضافه شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['users-stats'] }),
      ])
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'خطا در ذخیره کاربر'
      setFormError(message)
      toast.error(message)
    },
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setUserActive(id, isActive),
    onSuccess: async (_data, vars) => {
      toast.success(vars.isActive ? 'کاربر فعال شد' : 'کاربر غیرفعال شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['users-stats'] }),
      ])
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'خطا در تغییر وضعیت کاربر')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: async () => {
      setDeleteTarget(null)
      toast.success('کاربر حذف شد')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['users-stats'] }),
      ])
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'خطا در حذف کاربر')
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setForm({
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      role: user.role,
      isActive: user.isActive,
    })
    setFormError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  function submitUser() {
    const validation = userSchema(Boolean(editing)).safeParse(form)
    const errors = validationErrors(validation)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    saveMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title="کاربران"
        description="مدیریت ادمین‌ها و مشتریان — شناسه اصلی شماره همراه است"
        action={
          <Button type="button" onClick={openCreate}>
            کاربر جدید
          </Button>
        }
      />

      {statsQuery.data ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="کل کاربران" value={statsQuery.data.total.toLocaleString('fa-IR')} />
          <StatCard label="فعال" value={statsQuery.data.active.toLocaleString('fa-IR')} />
          <StatCard label="غیرفعال" value={statsQuery.data.inactive.toLocaleString('fa-IR')} />
          <StatCard
            label="ادمین / مشتری"
            value={`${statsQuery.data.byRole.admin.toLocaleString('fa-IR')} / ${statsQuery.data.byRole.customer.toLocaleString('fa-IR')}`}
          />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 lg:flex-row lg:items-end">
        <Field label="جستجو">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="شماره همراه یا نام"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(searchInput.trim())
              }
            }}
          />
        </Field>
        <Field label="نقش">
          <Select
            value={role}
            onChange={(e) => {
              setPage(1)
              setRole(e.target.value as UserRole | '')
            }}
          >
            <option value="">همه</option>
            <option value="admin">ادمین</option>
            <option value="customer">مشتری</option>
          </Select>
        </Field>
        <Field label="وضعیت">
          <Select
            value={activeFilter}
            onChange={(e) => {
              setPage(1)
              setActiveFilter(e.target.value as 'all' | 'true' | 'false')
            }}
          >
            <option value="all">همه</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
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

      {usersQuery.isLoading ? <Spinner /> : null}
      {usersQuery.isError ? (
        <Alert>
          {usersQuery.error instanceof ApiError
            ? usersQuery.error.message
            : 'خطا در دریافت کاربران'}
        </Alert>
      ) : null}

      {usersQuery.data && usersQuery.data.items.length === 0 ? (
        <EmptyState title="کاربری یافت نشد" actionLabel="ایجاد کاربر" onAction={openCreate} />
      ) : null}

      {usersQuery.data && usersQuery.data.items.length > 0 ? (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line bg-bg-soft/60 text-right">
                <th className="px-4 py-3 font-semibold">نام</th>
                <th className="px-4 py-3 font-semibold">شماره همراه</th>
                <th className="px-4 py-3 font-semibold">نقش</th>
                <th className="px-4 py-3 font-semibold">وضعیت</th>
                <th className="px-4 py-3 font-semibold">تاریخ</th>
                <th className="px-4 py-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.items.map((user) => {
                const id = entityId(user)
                return (
                  <tr key={id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      {user.fullName || `${user.firstName} ${user.lastName}`}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {user.phone || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.role === 'admin' ? 'info' : 'neutral'}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(user)}>
                          ویرایش
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setOrdersTarget(user)}>
                          مشاهده سفارشات
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={activeMutation.isPending}
                          onClick={() =>
                            activeMutation.mutate({ id, isActive: !user.isActive })
                          }
                        >
                          {user.isActive ? 'غیرفعال' : 'فعال'}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(user)}
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
            page={usersQuery.data.meta.page}
            totalPages={usersQuery.data.meta.totalPages}
            total={usersQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? 'ویرایش کاربر' : 'کاربر جدید'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={submitUser}
            >
              {saveMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام" error={fieldErrors.firstName}>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
              aria-invalid={Boolean(fieldErrors.firstName)}
            />
          </Field>
          <Field label="نام خانوادگی" error={fieldErrors.lastName}>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
              aria-invalid={Boolean(fieldErrors.lastName)}
            />
          </Field>
          <Field label="شماره همراه" error={fieldErrors.phone}>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="09123456789"
              dir="ltr"
              required
              aria-invalid={Boolean(fieldErrors.phone)}
            />
          </Field>
          <Field label={editing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'} error={fieldErrors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editing}
              minLength={6}
              aria-invalid={Boolean(fieldErrors.password)}
            />
          </Field>
          <Field label="نقش" error={fieldErrors.role}>
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              aria-invalid={Boolean(fieldErrors.role)}
            >
              <option value="customer">مشتری</option>
              <option value="admin">ادمین</option>
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
        </div>
        {/*
          TODO(phone-login): ورود با OTP روی همین شماره همراه
        */}
        {formError ? (
          <div className="mt-3">
            <Alert>{formError}</Alert>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(ordersTarget)}
        title={`سفارشات ${ordersTarget?.fullName || `${ordersTarget?.firstName ?? ''} ${ordersTarget?.lastName ?? ''}`.trim()}`}
        onClose={() => setOrdersTarget(null)}
        wide
        footer={<Button type="button" variant="ghost" onClick={() => setOrdersTarget(null)}>بستن</Button>}
      >
        {userOrdersQuery.isLoading ? <Spinner label="در حال دریافت سفارشات کاربر..." /> : null}
        {userOrdersQuery.isError ? <Alert>دریافت سفارشات این کاربر انجام نشد.</Alert> : null}
        {userOrdersQuery.data?.items.length === 0 ? (
          <EmptyState title="این کاربر سفارشی ندارد" description="هنوز سفارشی برای این حساب ثبت نشده است." />
        ) : null}
        {userOrdersQuery.data?.items.length ? (
          <div className="grid gap-3">
            <div className="rounded-xl bg-bg-soft px-4 py-3 text-sm font-bold">
              مجموع سفارش‌ها: {userOrdersQuery.data.meta.total.toLocaleString('fa-IR')}
            </div>
            {userOrdersQuery.data.items.map((order) => (
              <article key={entityId(order)} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <strong dir="ltr">{order.orderNumber}</strong>
                    <Badge tone={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : order.status === 'pending' ? 'warning' : 'info'}>
                      {orderStatusLabels[order.status]}
                    </Badge>
                  </div>
                  <p className="m-0 text-sm text-muted">
                    {formatDate(order.createdAt)} · {formatPrice(order.totalAmount)}
                  </p>
                </div>
                <Link to={`/orders/${entityId(order)}`} onClick={() => setOrdersTarget(null)}>
                  <Button type="button" variant="ghost" size="sm">جزئیات سفارش</Button>
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف کاربر"
        message={`کاربر «${deleteTarget?.phone ?? deleteTarget?.firstName ?? ''}» برای همیشه حذف شود؟`}
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
