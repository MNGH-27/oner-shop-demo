import type { Customer, CustomerAddress } from "@core/types/shop.types";

const digitsOnly = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");

const normalizeInput = (event: React.FormEvent<HTMLInputElement>) => {
  event.currentTarget.value = digitsOnly(event.currentTarget.value);
};

export function AddressFields({
  address,
  user,
  showDefault = true,
}: {
  address?: Partial<CustomerAddress>;
  user?: Customer;
  showDefault?: boolean;
}) {
  return (
    <div className="address-form-fields">
      <label>
        عنوان نشانی
        <input
          name="title"
          required
          minLength={2}
          maxLength={40}
          defaultValue={address?.title ?? "منزل"}
          placeholder="مثلاً منزل یا محل کار"
        />
      </label>
      <label>
        نام و نام خانوادگی گیرنده
        <input
          name="fullName"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          defaultValue={
            address?.fullName ??
            (user ? `${user.firstName} ${user.lastName}`.trim() : "")
          }
        />
      </label>
      <label>
        شماره همراه گیرنده
        <input
          name="phone"
          required
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          pattern="09[0-9]{9}"
          maxLength={11}
          onInput={normalizeInput}
          defaultValue={address?.phone ?? user?.phone ?? ""}
          placeholder="09121234567"
        />
      </label>
      <label>
        استان
        <input
          name="province"
          required
          minLength={2}
          maxLength={80}
          autoComplete="address-level1"
          defaultValue={address?.province ?? ""}
        />
      </label>
      <label>
        شهر
        <input
          name="city"
          required
          minLength={2}
          maxLength={80}
          autoComplete="address-level2"
          defaultValue={address?.city ?? ""}
        />
      </label>
      <label>
        کد پستی
        <input
          name="postalCode"
          required
          dir="ltr"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[0-9]{10}"
          minLength={10}
          maxLength={10}
          onInput={normalizeInput}
          defaultValue={address?.postalCode ?? ""}
          placeholder="۱۰ رقم بدون خط تیره"
        />
      </label>
      <label className="address-line-field">
        نشانی کامل
        <textarea
          name="addressLine"
          required
          minLength={5}
          maxLength={500}
          rows={4}
          autoComplete="street-address"
          defaultValue={address?.addressLine ?? ""}
        />
      </label>
      {showDefault ? (
        <label className="address-default-field">
          <input
            name="isDefault"
            type="checkbox"
            defaultChecked={address?.isDefault ?? false}
          />
          این نشانی، انتخاب پیش‌فرض من باشد
        </label>
      ) : null}
    </div>
  );
}
