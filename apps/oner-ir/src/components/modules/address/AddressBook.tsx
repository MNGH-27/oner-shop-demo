"use client";

import axios from "axios";
import { MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from "@core/services/api/address.api";
import { useAuthStore } from "@core/services/stores/auth.store";
import type { CustomerAddress } from "@core/types/shop.types";
import { AddressFields } from "./AddressFields";

function message(error: unknown) {
  if (!axios.isAxiosError(error)) return "انجام عملیات ممکن نشد";
  const value = error.response?.data?.message;
  return Array.isArray(value)
    ? value[0]
    : typeof value === "string"
      ? value
      : "انجام عملیات ممکن نشد";
}

const addressPayload = (form: HTMLFormElement): AddressInput => {
  const values = new FormData(form);
  return {
    title: String(values.get("title") ?? "").trim(),
    fullName: String(values.get("fullName") ?? "").trim(),
    phone: String(values.get("phone") ?? "").trim(),
    province: String(values.get("province") ?? "").trim(),
    city: String(values.get("city") ?? "").trim(),
    addressLine: String(values.get("addressLine") ?? "").trim(),
    postalCode: String(values.get("postalCode") ?? "").trim(),
    isDefault: values.get("isDefault") === "on",
  };
};

export function AddressBook() {
  const user = useAuthStore((state) => state.user)!;
  const setUser = useAuthStore((state) => state.setUser);
  const [addresses, setAddresses] = useState(user.addresses ?? []);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const sync = (next: CustomerAddress[]) => {
    setAddresses(next);
    setUser({ ...user, addresses: next });
  };

  useEffect(() => {
    let active = true;
    void getAddresses()
      .then((next) => {
        if (active) sync(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // The user id changes after switching accounts; address mutations sync locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const refresh = async () => sync(await getAddresses());

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = addressPayload(event.currentTarget);
      if (editing) await updateAddress(editing.id, payload);
      else await createAddress(payload);
      await refresh();
      setEditing(null);
      setShowForm(false);
      toast.success(editing ? "نشانی ویرایش شد" : "نشانی جدید ذخیره شد");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id: string) => {
    setBusy(true);
    try {
      await setDefaultAddress(id);
      await refresh();
      toast.success("نشانی پیش‌فرض تغییر کرد");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (address: CustomerAddress) => {
    if (!window.confirm(`نشانی «${address.title}» حذف شود؟`)) return;
    setBusy(true);
    try {
      await deleteAddress(address.id);
      await refresh();
      if (editing?.id === address.id) {
        setEditing(null);
        setShowForm(false);
      }
      toast.success("نشانی حذف شد");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="address-book">
      <header>
        <div>
          <span>دفترچه نشانی‌ها</span>
          <h2>نشانی‌های گیرنده</h2>
        </div>
        <button
          type="button"
          className="secondary-btn address-add-button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          disabled={busy}
        >
          <Plus size={17} /> نشانی جدید
        </button>
      </header>

      {addresses.length ? (
        <div className="address-book-list">
          {addresses.map((address) => (
            <article className="address-card" key={address.id}>
              <div className="address-card-title">
                <MapPin size={19} />
                <b>{address.title}</b>
                {address.isDefault ? <span>پیش‌فرض</span> : null}
              </div>
              <p>
                {address.province}، {address.city}، {address.addressLine}
              </p>
              <small>
                {address.fullName} · <span dir="ltr">{address.phone}</span> · کد
                پستی <span dir="ltr">{address.postalCode}</span>
              </small>
              <div className="address-card-actions">
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => makeDefault(address.id)}
                    disabled={busy}
                  >
                    <Star size={15} /> انتخاب پیش‌فرض
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(address);
                    setShowForm(true);
                  }}
                  disabled={busy}
                >
                  <Pencil size={15} /> ویرایش
                </button>
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => remove(address)}
                  disabled={busy}
                >
                  <Trash2 size={15} /> حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="address-book-empty">
          <MapPin size={28} />
          <p>هنوز نشانی‌ای ذخیره نکرده‌اید.</p>
        </div>
      )}

      {showForm ? (
        <form
          key={editing?.id ?? "new"}
          className="address-editor"
          onSubmit={submit}
        >
          <div className="address-editor-heading">
            <h3>{editing ? "ویرایش نشانی" : "ثبت نشانی جدید"}</h3>
            <button
              type="button"
              aria-label="بستن فرم نشانی"
              onClick={() => {
                setEditing(null);
                setShowForm(false);
              }}
            >
              <X size={19} />
            </button>
          </div>
          <AddressFields address={editing ?? undefined} user={user} />
          <button className="primary-btn" disabled={busy}>
            {busy ? "در حال ذخیره..." : "ذخیره نشانی"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
