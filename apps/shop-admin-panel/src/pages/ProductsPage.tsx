import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCategories } from "../api/categories";
import { ApiError } from "../api/client";
import {
  createProduct,
  deleteProduct,
  fetchProduct,
  fetchProducts,
  updateProduct,
  updateProductPrice,
} from "../api/products";
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  TableShell,
} from "../components/ui/Page";
import { Button } from "../components/ui/Button";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { PriceInput } from "../components/ui/PriceInput";
import { ImageUploader } from "../components/ui/ImageUploader";
import { toast } from "sonner";
import { ConfirmDialog, Modal } from "../components/ui/Modal";
import { mediaUrl } from "../api/uploads";
import { categoryName, entityId } from "../lib/id";
import { formatDate, formatNumber, formatPrice } from "../lib/labels";
import type {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from "../types/product";
import {
  priceSchema,
  productSchema,
  stockSchema,
  validationErrors,
  type FieldErrors,
} from "../lib/validation";

const RichTextEditor = lazy(() =>
  import("../components/ui/RichTextEditor").then((module) => ({
    default: module.RichTextEditor,
  })),
);

type VariantForm = {
  color?: string;
  size?: string;
  stock: string;
  lowStockThreshold: string;
};

type FormState = {
  name: string;
  description: string;
  descriptionHtml: string;
  category: string;
  images: string[];
  price: string;
  stock: string;
  discountPercent: string;
  lowStockThreshold: string;
  colors: string[];
  colorHexes: Record<string, string>;
  sizes: string[];
  relatedProducts: string[];
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  descriptionHtml: "",
  category: "",
  images: [],
  price: "",
  stock: "0",
  discountPercent: "0",
  lowStockThreshold: "",
  colors: [],
  colorHexes: {},
  sizes: [],
  relatedProducts: [],
  isActive: true,
};

function parseColors(value: string[], hexes: Record<string, string>) {
  return value.map((name) => ({ name, hex: hexes[name] }));
}

function parseSizes(value: string[]) {
  return value.map((label) => {
    const match = label.match(/^(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)$/i);
    if (match) {
      return { label, widthCm: Number(match[1]), lengthCm: Number(match[2]) };
    }
    return { label };
  });
}

function inferSizeType(sizes: string[]): "letter" | "dimension" {
  return sizes.length > 0 &&
    sizes.every((label) =>
      /^\d+(?:\.\d+)?\s*[x×*]\s*\d+(?:\.\d+)?$/i.test(label),
    )
    ? "dimension"
    : "letter";
}

function parseThreshold(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function buildVariantForms(product: Product): VariantForm[] {
  if (!product.colors?.length && !product.sizes?.length) return [];
  const colors = product.colors?.length
    ? product.colors.map((color) => color.name)
    : [undefined];
  const sizes = product.sizes?.length
    ? product.sizes.map((size) => size.label)
    : [undefined];

  return colors.flatMap((color) =>
    sizes.map((size) => {
      const current = product.variants?.find(
        (variant) =>
          (variant.color ?? "") === (color ?? "") &&
          (variant.size ?? "") === (size ?? ""),
      );
      return {
        color,
        size,
        stock: current?.stock ? String(current.stock) : "",
        lowStockThreshold:
          current?.lowStockThreshold == null
            ? ""
            : String(current.lowStockThreshold),
      };
    }),
  );
}

export function ProductsPage({
  editorMode,
}: {
  editorMode?: "create" | "edit";
}) {
  const navigate = useNavigate();
  const { productId = "" } = useParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [priceTarget, setPriceTarget] = useState<Product | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [formVariants, setFormVariants] = useState<VariantForm[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [colorHexInput, setColorHexInput] = useState("#d8c4a8");
  const [sizeInput, setSizeInput] = useState("");
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");
  const [sideError, setSideError] = useState<string | null>(null);
  const [sideFieldErrors, setSideFieldErrors] = useState<FieldErrors>({});

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      category: categoryFilter || undefined,
      onlyActive: onlyActive || undefined,
    }),
    [page, search, categoryFilter, onlyActive],
  );

  const productsQuery = useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-options"],
    queryFn: () => fetchCategories({ limit: 100 }),
  });

  const relatedQuery = useQuery({
    queryKey: ["related-product-options", relatedSearch],
    queryFn: () =>
      fetchProducts({ limit: 100, search: relatedSearch || undefined }),
    enabled: relatedOpen || Boolean(editorMode),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const variants = formVariants.map((variant) => ({
        color: variant.color,
        size: variant.size,
        stock: Number(variant.stock),
        lowStockThreshold: parseThreshold(variant.lowStockThreshold),
      }));
      if (editing) {
        const payload: UpdateProductPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          descriptionHtml: form.descriptionHtml || undefined,
          category: form.category,
          images: form.images,
          discountPercent: Number(form.discountPercent) || 0,
          lowStockThreshold: parseThreshold(form.lowStockThreshold),
          colors: parseColors(form.colors, form.colorHexes),
          sizeType: inferSizeType(form.sizes),
          sizes: parseSizes(form.sizes),
          isActive: form.isActive,
          relatedProducts: form.relatedProducts,
          stock: Number(form.stock) || 0,
          variants,
        };
        return updateProduct(entityId(editing), payload);
      } else {
        const payload: CreateProductPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          descriptionHtml: form.descriptionHtml || undefined,
          category: form.category,
          images: form.images,
          price: Number(form.price) || 0,
          discountPercent: Number(form.discountPercent) || 0,
          stock: Number(form.stock) || 0,
          lowStockThreshold: parseThreshold(form.lowStockThreshold),
          colors: parseColors(form.colors, form.colorHexes),
          sizeType: inferSizeType(form.sizes),
          sizes: parseSizes(form.sizes),
          isActive: form.isActive,
          relatedProducts: form.relatedProducts,
          variants,
        };
        return createProduct(payload);
      }
    },
    onSuccess: async () => {
      setModalOpen(false);
      const wasEditing = Boolean(editing);
      setEditing(null);
      setForm(emptyForm);
      setFormError(null);
      toast.success(wasEditing ? "محصول ویرایش شد" : "محصول اضافه شد");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/products", { replace: true });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : "خطا در ذخیره محصول";
      setFormError(message);
      toast.error(message);
    },
  });

  const priceMutation = useMutation({
    mutationFn: () =>
      updateProductPrice(entityId(priceTarget!), {
        price: Number(priceValue),
      }),
    onSuccess: async () => {
      setPriceTarget(null);
      setSideError(null);
      toast.success("قیمت بروزرسانی شد");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : "خطا در بروزرسانی قیمت";
      setSideError(message);
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("محصول حذف شد");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف محصول");
    },
  });

  async function openCreate() {
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
    setColorInput("");
    setColorHexInput("#d8c4a8");
    setSizeInput("");
    setVariantColor("");
    setVariantSize("");
    setFormVariants([]);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      descriptionHtml: product.descriptionHtml ?? "",
      category:
        typeof product.category === "string"
          ? product.category
          : entityId(product.category),
      images: product.images ?? [],
      price: String(product.price),
      stock: String(product.stock ?? 0),
      discountPercent: String(product.discountPercent ?? 0),
      lowStockThreshold:
        product.lowStockThreshold === null ||
        product.lowStockThreshold === undefined
          ? ""
          : String(product.lowStockThreshold),
      colors: (product.colors ?? []).map((color) => color.name),
      colorHexes: Object.fromEntries(
        (product.colors ?? []).map((color) => [
          color.name,
          color.hex ?? "#d8c4a8",
        ]),
      ),
      sizes: (product.sizes ?? []).map((size) => size.label),
      relatedProducts: (product.relatedProducts ?? []).map((item) =>
        typeof item === "string" ? item : item._id,
      ),
      isActive: product.isActive,
    });
    setFormError(null);
    setFieldErrors({});
    setColorInput("");
    setColorHexInput("#d8c4a8");
    setSizeInput("");
    setVariantColor("");
    setVariantSize("");
    setFormVariants(buildVariantForms(product));
    setModalOpen(true);
  }

  useEffect(() => {
    if (editorMode === "create") {
      const timer = window.setTimeout(() => void openCreate(), 0);
      return () => window.clearTimeout(timer);
    }
    if (editorMode === "edit" && productId) {
      void fetchProduct(productId)
        .then(openEdit)
        .catch((error) => {
          toast.error(
            error instanceof ApiError ? error.message : "محصول پیدا نشد",
          );
          navigate("/products", { replace: true });
        });
    }
    // این effect فقط با تغییر مسیر و شناسه محصول اجرا می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode, productId]);

  function addOption(kind: "color" | "size") {
    const raw = kind === "color" ? colorInput : sizeInput;
    const value = raw.trim();
    if (!value) return;
    const values = kind === "color" ? form.colors : form.sizes;
    if (
      values.some(
        (item) =>
          item.toLocaleLowerCase("fa") === value.toLocaleLowerCase("fa"),
      )
    )
      return;
    const colors = kind === "color" ? [...form.colors, value] : form.colors;
    const sizes = kind === "size" ? [...form.sizes, value] : form.sizes;
    setForm((state) => ({
      ...state,
      colors,
      sizes,
      colorHexes:
        kind === "color"
          ? { ...state.colorHexes, [value]: colorHexInput.toUpperCase() }
          : state.colorHexes,
    }));
    if (kind === "color") {
      setColorInput("");
      setColorHexInput("#d8c4a8");
    }
    else setSizeInput("");
  }

  function removeOption(kind: "color" | "size", value: string) {
    const colors =
      kind === "color"
        ? form.colors.filter((item) => item !== value)
        : form.colors;
    const sizes =
      kind === "size"
        ? form.sizes.filter((item) => item !== value)
        : form.sizes;
    setForm((state) => {
      if (kind !== "color") return { ...state, colors, sizes };
      const colorHexes = { ...state.colorHexes };
      delete colorHexes[value];
      return { ...state, colors, sizes, colorHexes };
    });
    setFormVariants((current) =>
      current.filter((item) =>
        kind === "color" ? item.color !== value : item.size !== value,
      ),
    );
    if (kind === "color" && variantColor === value) setVariantColor("");
    if (kind === "size" && variantSize === value) setVariantSize("");
  }

  function addOnEnter(
    event: KeyboardEvent<HTMLInputElement>,
    kind: "color" | "size",
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addOption(kind);
    }
  }

  function addVariant() {
    if (!variantColor || !variantSize) return;
    if (
      formVariants.some(
        (item) => item.color === variantColor && item.size === variantSize,
      )
    )
      return;
    setFormVariants((items) => [
      ...items,
      {
        color: variantColor,
        size: variantSize,
        stock: "",
        lowStockThreshold: "",
      },
    ]);
    setVariantColor("");
    setVariantSize("");
    setFieldErrors((errors) => ({ ...errors, variants: "" }));
  }

  function submitProduct() {
    const errors = validationErrors(
      productSchema(Boolean(editing)).safeParse(form),
    );
    const hasOptions = form.colors.length > 0 || form.sizes.length > 0;
    if (hasOptions && !formVariants.length)
      errors.variants = "حداقل یک ترکیب رنگ و سایز اضافه کنید.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    if (!hasOptions) {
      const stockErrors = validationErrors(
        stockSchema.safeParse({
          stock: form.stock || "0",
          lowStockThreshold: form.lowStockThreshold,
        }),
      );
      if (stockErrors.stock) {
        setFieldErrors({ stock: stockErrors.stock });
        return;
      }
    }
    for (const [index, variant] of formVariants.entries()) {
      const variantErrors = validationErrors(
        stockSchema.safeParse({
          stock: variant.stock || "0",
          lowStockThreshold: form.lowStockThreshold,
        }),
      );
      if (variantErrors.stock) {
        setFieldErrors({ [`formVariant-${index}`]: variantErrors.stock });
        return;
      }
    }
    saveMutation.mutate();
  }

  function submitPrice() {
    const errors = validationErrors(
      priceSchema.safeParse({ price: priceValue }),
    );
    setSideFieldErrors(errors);
    if (Object.keys(errors).length) return;
    priceMutation.mutate();
  }

  const remainingColors = form.colors.filter((color) =>
    form.sizes.some(
      (size) =>
        !formVariants.some(
          (item) => item.color === color && item.size === size,
        ),
    ),
  );
  const remainingSizes = variantColor
    ? form.sizes.filter(
        (size) =>
          !formVariants.some(
            (item) => item.color === variantColor && item.size === size,
          ),
      )
    : form.sizes;

  return (
    <div>
      <div className={editorMode ? "hidden" : ""}>
        <PageHeader
          title="محصولات"
          description="مدیریت کالا، قیمت و موجودی"
          action={
            <Button type="button" onClick={() => navigate("/products/new")}>
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
                setPage(1);
                setCategoryFilter(e.target.value);
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
              value={onlyActive ? "true" : "false"}
              onChange={(e) => {
                setPage(1);
                setOnlyActive(e.target.value === "true");
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
              setPage(1);
              setSearch(searchInput.trim());
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
              : "خطا در دریافت محصولات"}
          </Alert>
        ) : null}

        {productsQuery.data && productsQuery.data.items.length === 0 ? (
          <EmptyState
            title="محصولی یافت نشد"
            actionLabel="ایجاد محصول"
            onAction={() => navigate("/products/new")}
          />
        ) : null}

        {productsQuery.data && productsQuery.data.items.length > 0 ? (
          <>
            <TableShell>
              <thead>
                <tr className="border-b border-line bg-bg-soft/60 text-right">
                  <th className="px-4 py-3 font-semibold">محصول</th>
                  <th className="px-4 py-3 font-semibold">دسته</th>
                  <th className="px-4 py-3 font-semibold">قیمت</th>
                  <th className="px-4 py-3 font-semibold">موجودی</th>
                  <th className="px-4 py-3 font-semibold">وضعیت</th>
                  <th className="px-4 py-3 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {productsQuery.data.items.map((product) => {
                  const id = entityId(product);
                  const thumb = product.images?.[0];
                  return (
                    <tr
                      key={id}
                      className="border-b border-line last:border-b-0"
                    >
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
                      <td className="px-4 py-3">
                        {categoryName(product.category)}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {formatPrice(product.price)}
                        {product.discountPercent ? (
                          <div className="text-xs text-danger">
                            {formatNumber(product.discountPercent)}٪ تخفیف
                          </div>
                        ) : null}
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
                        <Badge tone={product.isActive ? "success" : "danger"}>
                          {product.isActive ? "فعال" : "غیرفعال"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/products/${id}/edit`)}
                          >
                            ویرایش
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPriceTarget(product);
                              setPriceValue(String(product.price));
                              setSideError(null);
                            }}
                          >
                            قیمت
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
                  );
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
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "ویرایش محصول" : "محصول جدید"}
        onClose={() => navigate("/products")}
        wide
        page
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/products")}
            >
              انصراف
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={submitProduct}
            >
              {saveMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام" error={fieldErrors.name}>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </Field>
          <Field label="دسته" error={fieldErrors.category}>
            <Select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              required
              aria-invalid={Boolean(fieldErrors.category)}
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
              <Field label="قیمت (تومان)" error={fieldErrors.price}>
                <PriceInput
                  value={form.price}
                  onValueChange={(price) => setForm((f) => ({ ...f, price }))}
                  placeholder="مثلاً 1850000"
                  aria-invalid={Boolean(fieldErrors.price)}
                />
              </Field>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-xl bg-bg-soft px-3 py-2 text-sm text-muted">
              قیمت فعلی: {formatPrice(editing.price)} — موجودی:{" "}
              {formatNumber(editing.stock)}
            </div>
          )}
          <Field
            label="آستانه اعلان موجودی"
            hint="وقتی موجودی به این عدد برسد (یا کمتر شود)، در تلگرام اطلاع داده می‌شود. خالی = بدون اعلان."
            error={fieldErrors.lowStockThreshold}
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
              aria-invalid={Boolean(fieldErrors.lowStockThreshold)}
            />
          </Field>
          <Field
            label="درصد تخفیف کالا"
            hint="بین صفر تا صد"
            error={fieldErrors.discountPercent}
          >
            <Input
              aria-invalid={Boolean(fieldErrors.discountPercent)}
              type="number"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountPercent: e.target.value }))
              }
              dir="ltr"
            />
          </Field>
          {!form.colors.length && !form.sizes.length ? (
            <Field
              label="موجودی محصول"
              hint="برای محصول بدون رنگ و سایز، موجودی را مستقیم وارد کنید."
              error={fieldErrors.stock}
            >
              <Input
                type="number"
                min={0}
                step={1}
                value={form.stock}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    stock: e.target.value,
                  }))
                }
                dir="ltr"
                aria-invalid={Boolean(fieldErrors.stock)}
              />
            </Field>
          ) : null}
          <Field
            label="رنگ‌های قابل انتخاب"
            hint="اختیاری؛ برای محصول ساده رنگ و سایز را خالی بگذارید."
            error={fieldErrors.colors}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => addOnEnter(e, "color")}
                placeholder="مثلاً کرم"
              />
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-2 text-xs text-muted">
                پالت
                <input
                  type="color"
                  value={colorHexInput}
                  onChange={(event) => setColorHexInput(event.target.value)}
                  className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="انتخاب رنگ جدید"
                />
                <span dir="ltr">{colorHexInput.toUpperCase()}</span>
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => addOption("color")}
              >
                افزودن
              </Button>
            </div>
            {form.colors.length ? (
              <div className="flex flex-wrap gap-2">
                {form.colors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-2 rounded-full bg-bg-soft px-3 py-1 text-sm"
                  >
                    <input
                      type="color"
                      value={form.colorHexes[color] ?? "#d8c4a8"}
                      onChange={(event) =>
                        setForm((state) => ({
                          ...state,
                          colorHexes: {
                            ...state.colorHexes,
                            [color]: event.target.value.toUpperCase(),
                          },
                        }))
                      }
                      className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                      aria-label={`انتخاب پالت رنگ ${color}`}
                      title={`پالت رنگ ${color}`}
                    />
                    <span>{color}</span>
                    <code className="text-[10px] text-muted" dir="ltr">
                      {form.colorHexes[color] ?? "#D8C4A8"}
                    </code>
                    <button
                      type="button"
                      className="text-danger"
                      onClick={() => removeOption("color", color)}
                      aria-label={`حذف رنگ ${color}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="سایزهای قابل انتخاب"
              error={fieldErrors.sizes}
              hint="سایز حروفی مثل XL یا ابعاد مثل 120×80 را وارد و اضافه کنید."
            >
              <div className="flex gap-2">
                <Input
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  onKeyDown={(e) => addOnEnter(e, "size")}
                  placeholder="مثلاً XL یا 120×80"
                  dir="ltr"
                  aria-invalid={Boolean(fieldErrors.sizes)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addOption("size")}
                >
                  افزودن
                </Button>
              </div>
              {form.sizes.length ? (
                <div className="flex flex-wrap gap-2">
                  {form.sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-2 rounded-full bg-bg-soft px-3 py-1 text-sm"
                      dir="ltr"
                    >
                      <span>{size}</span>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => removeOption("size", size)}
                        aria-label={`حذف سایز ${size}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </Field>
          </div>
          {form.colors.length && form.sizes.length ? (
            <div className="sm:col-span-2 rounded-xl border border-line p-4">
              <div className="mb-4">
                <strong className="text-sm">ترکیب‌های محصول</strong>
                <p className="mt-1 mb-0 text-xs text-muted">
                  از رنگ‌ها و سایزهای باقی‌مانده یک ترکیب بسازید.
                </p>
              </div>
              {remainingColors.length ? (
                <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Select
                    value={variantColor}
                    onChange={(e) => {
                      setVariantColor(e.target.value);
                      setVariantSize("");
                    }}
                  >
                    <option value="">انتخاب رنگ</option>
                    {remainingColors.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={variantSize}
                    onChange={(e) => setVariantSize(e.target.value)}
                    disabled={!variantColor}
                  >
                    <option value="">انتخاب سایز</option>
                    {remainingSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    onClick={addVariant}
                    disabled={!variantColor || !variantSize}
                  >
                    ساخت ترکیب
                  </Button>
                </div>
              ) : (
                <p className="mb-4 text-sm text-muted">
                  تمام ترکیب‌های ممکن اضافه شده‌اند.
                </p>
              )}
              {fieldErrors.variants ? (
                <span className="mb-3 block text-xs font-medium text-danger">
                  {fieldErrors.variants}
                </span>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {formVariants.map((variant, index) => (
                  <article
                    key={`${variant.color}-${variant.size}`}
                    className="rounded-xl border border-line bg-bg/40 p-3"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface px-2.5 py-1 text-xs">
                          {variant.color}
                        </span>
                        <span className="text-muted">×</span>
                        <span
                          className="rounded-full bg-surface px-2.5 py-1 text-xs"
                          dir="ltr"
                        >
                          {variant.size}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-danger"
                        onClick={() =>
                          setFormVariants((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        حذف
                      </button>
                    </div>
                    <Field
                      label="تعداد موجودی"
                      error={fieldErrors[`formVariant-${index}`]}
                    >
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={variant.stock}
                        placeholder="0"
                        aria-invalid={Boolean(
                          fieldErrors[`formVariant-${index}`],
                        )}
                        onChange={(e) =>
                          setFormVariants((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, stock: e.target.value }
                                : item,
                            ),
                          )
                        }
                        dir="ltr"
                      />
                    </Field>
                  </article>
                ))}
              </div>
              {formVariants.length ? (
                <p className="mt-3 mb-0 text-xs text-muted">
                  اگر مقدار موجودی یک ترکیب را خالی بگذارید، موجودی آن صفر ثبت
                  می‌شود.
                </p>
              ) : null}
            </div>
          ) : null}
          <Field label="وضعیت">
            <Select
              value={form.isActive ? "true" : "false"}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.value === "true" }))
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="توضیحات کامل محصول"
              hint="این محتوا در بخش توضیحات صفحه محصول Oner نمایش داده می‌شود."
              error={fieldErrors.descriptionHtml}
            >
              <Suspense
                fallback={
                  <div className="flex min-h-64 items-center justify-center text-sm text-muted">
                    در حال بارگذاری ویرایشگر…
                  </div>
                }
              >
                <RichTextEditor
                  value={form.descriptionHtml}
                  onChange={(descriptionHtml) =>
                    setForm((state) => ({ ...state, descriptionHtml }))
                  }
                />
              </Suspense>
            </Field>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="text-sm">کالاهای مرتبط</strong>
                <p className="mt-1 mb-0 text-xs text-muted">
                  محصولاتی که پایین صفحه این کالا پیشنهاد داده می‌شوند.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRelatedOpen(true)}
              >
                انتخاب کالاها
              </Button>
            </div>
            {form.relatedProducts.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.relatedProducts.map((id) => {
                  const item = relatedQuery.data?.items.find(
                    (product) => entityId(product) === id,
                  );
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 rounded-full bg-bg-soft px-3 py-1.5 text-sm"
                    >
                      <span>{item?.name ?? "محصول انتخاب‌شده"}</span>
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() =>
                          setForm((state) => ({
                            ...state,
                            relatedProducts: state.relatedProducts.filter(
                              (value) => value !== id,
                            ),
                          }))
                        }
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 mb-0 text-xs text-muted">
                هنوز کالایی انتخاب نشده است.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <ImageUploader
              label="تصاویر محصول"
              multiple
              value={form.images}
              onChange={(images) => setForm((f) => ({ ...f, images }))}
            />
            {fieldErrors.images ? (
              <span className="mt-1.5 block text-xs font-medium text-danger">
                {fieldErrors.images}
              </span>
            ) : null}
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
        open={relatedOpen}
        title="انتخاب کالاهای مرتبط"
        onClose={() => setRelatedOpen(false)}
        wide
        footer={
          <Button type="button" onClick={() => setRelatedOpen(false)}>
            تأیید انتخاب
          </Button>
        }
      >
        <div className="grid gap-4">
          <Field label="جستجوی کالا">
            <Input
              value={relatedSearch}
              onChange={(event) => setRelatedSearch(event.target.value)}
              placeholder="نام محصول"
            />
          </Field>
          {relatedQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="grid max-h-[55vh] gap-2 overflow-y-auto">
              {relatedQuery.data?.items
                .filter((item) => entityId(item) !== productId)
                .map((item) => {
                  const id = entityId(item),
                    checked = form.relatedProducts.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${checked ? "border-accent bg-accent/5" : "border-line"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm((state) => ({
                            ...state,
                            relatedProducts: checked
                              ? state.relatedProducts.filter(
                                  (value) => value !== id,
                                )
                              : [...state.relatedProducts, id],
                          }))
                        }
                      />
                      {item.images?.[0] ? (
                        <img
                          src={mediaUrl(item.images[0])}
                          alt=""
                          className="size-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="size-12 rounded-lg bg-bg-soft" />
                      )}
                      <span className="font-medium">{item.name}</span>
                    </label>
                  );
                })}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(priceTarget)}
        title={`قیمت — ${priceTarget?.name ?? ""}`}
        onClose={() => setPriceTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPriceTarget(null)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              disabled={priceMutation.isPending}
              onClick={submitPrice}
            >
              {priceMutation.isPending ? "..." : "ذخیره قیمت"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="قیمت (تومان)" error={sideFieldErrors.price}>
            <PriceInput
              value={priceValue}
              onValueChange={setPriceValue}
              aria-invalid={Boolean(sideFieldErrors.price)}
            />
          </Field>
          {priceValue !== "" ? (
            <p className="m-0 text-sm text-muted">
              نمایش: {formatPrice(Number(priceValue) || 0)}
            </p>
          ) : null}
          {sideError ? <Alert>{sideError}</Alert> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف محصول"
        message={`محصول «${deleteTarget?.name ?? ""}» حذف شود؟`}
        confirmLabel="حذف"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(entityId(deleteTarget));
        }}
      />
    </div>
  );
}
