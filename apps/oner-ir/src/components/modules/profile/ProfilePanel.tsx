"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  changePassword,
  loginCustomer,
  registerCustomer,
  requestOtp,
  updateProfile,
  verifyOtp,
} from "@core/services/api/auth.api";
import { useAuthStore } from "@core/services/stores/auth.store";

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  if (message === "Invalid credentials") {
    return "شماره همراه یا رمز عبور صحیح نیست";
  }
  return typeof message === "string" ? message : fallback;
};

export function ProfilePanel() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const [authMode, setAuthMode] = useState<"otp" | "password" | "register">(
    "otp",
  );
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [registration, setRegistration] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    passwordConfirmation: "",
  });
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(
      () => setCountdown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [countdown]);

  const sendCode = async () => {
    if (!/^09\d{9}$/.test(phone)) {
      toast.error("شماره همراه را به شکل 09121234567 وارد کنید");
      return;
    }
    setBusy(true);
    try {
      const response = await requestOtp(phone);
      setCountdown(response.retryAfter);
      setStep("code");
      toast.success("کد تأیید برای شما ارسال شد");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const retryAfter = Number(error.response?.data?.retryAfter);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          setCountdown(retryAfter);
          setStep("code");
        }
      }
      toast.error(errorMessage(error, "ارسال کد انجام نشد؛ دوباره تلاش کنید"));
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendCode();
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("کد تأیید ۶ رقمی را کامل وارد کنید");
      return;
    }
    setBusy(true);
    try {
      const response = await verifyOtp(phone, code);
      setAuth(response.accessToken, response.user);
      toast.success(
        response.isNewUser
          ? "حساب شما ساخته شد؛ لطفاً نام و نام خانوادگی را تکمیل کنید"
          : "با موفقیت وارد شدید",
      );
    } catch (error) {
      toast.error(errorMessage(error, "کد تأیید صحیح نیست"));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^09\d{9}$/.test(phone)) {
      toast.error("شماره همراه را به شکل 09121234567 وارد کنید");
      return;
    }
    if (password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    setBusy(true);
    try {
      const response = await loginCustomer(phone, password);
      setAuth(response.accessToken, response.user);
      toast.success("با موفقیت وارد شدید");
    } catch (error) {
      toast.error(errorMessage(error, "ورود انجام نشد؛ دوباره تلاش کنید"));
    } finally {
      setBusy(false);
    }
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    const firstName = registration.firstName.trim();
    const lastName = registration.lastName.trim();

    if (firstName.length < 2 || lastName.length < 2) {
      toast.error("نام و نام خانوادگی باید حداقل ۲ حرف باشند");
      return;
    }
    if (!/^09\d{9}$/.test(registration.phone)) {
      toast.error("شماره همراه را به شکل 09121234567 وارد کنید");
      return;
    }
    if (registration.password.length < 6) {
      toast.error("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (registration.password !== registration.passwordConfirmation) {
      toast.error("تکرار رمز عبور با رمز عبور یکسان نیست");
      return;
    }

    setBusy(true);
    try {
      const response = await registerCustomer({
        firstName,
        lastName,
        phone: registration.phone,
        password: registration.password,
      });
      setAuth(response.accessToken, response.user);
      toast.success("حساب شما با موفقیت ساخته شد");
    } catch (error) {
      toast.error(errorMessage(error, "ساخت حساب انجام نشد؛ دوباره تلاش کنید"));
    } finally {
      setBusy(false);
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    try {
      const updated = await updateProfile({
        firstName: String(values.firstName ?? ""),
        lastName: String(values.lastName ?? ""),
      });
      setUser(updated);
      toast.success("پروفایل ذخیره شد");
    } catch (error) {
      toast.error(errorMessage(error, "ذخیره پروفایل انجام نشد"));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const currentPassword = String(values.currentPassword ?? "");
    const newPassword = String(values.newPassword ?? "");
    const passwordConfirmation = String(values.passwordConfirmation ?? "");

    if (newPassword.length < 6) {
      toast.error("رمز عبور جدید باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (newPassword !== passwordConfirmation) {
      toast.error("تکرار رمز عبور با رمز جدید یکسان نیست");
      return;
    }

    setBusy(true);
    try {
      await changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      form.reset();
      toast.success("رمز عبور با موفقیت ذخیره شد");
    } catch (error) {
      toast.error(errorMessage(error, "تغییر رمز عبور انجام نشد"));
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="auth-card otp-card">
        <div className="auth-tabs" role="tablist" aria-label="روش ورود">
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "otp"}
            className={authMode === "otp" ? "active" : ""}
            onClick={() => setAuthMode("otp")}
            disabled={busy}
          >
            ورود با کد
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "password"}
            className={authMode === "password" ? "active" : ""}
            onClick={() => setAuthMode("password")}
            disabled={busy}
          >
            ورود با رمز
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "register"}
            className={authMode === "register" ? "active" : ""}
            onClick={() => setAuthMode("register")}
            disabled={busy}
          >
            ثبت‌نام
          </button>
        </div>
        {authMode === "register" ? (
          <form className="otp-form" onSubmit={submitRegistration}>
            <div className="otp-heading">
              <span>عضویت در <span className="brand-name">ONER</span></span>
              <h1>ساخت حساب کاربری</h1>
              <p>اطلاعات زیر را وارد کنید تا حساب شما ساخته شود.</p>
            </div>
            <div className="registration-name-fields">
              <label>
                نام
                <input
                  autoComplete="given-name"
                  value={registration.firstName}
                  onChange={(event) =>
                    setRegistration((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  minLength={2}
                  required
                  autoFocus
                />
              </label>
              <label>
                نام خانوادگی
                <input
                  autoComplete="family-name"
                  value={registration.lastName}
                  onChange={(event) =>
                    setRegistration((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  minLength={2}
                  required
                />
              </label>
            </div>
            <label>
              شماره همراه
              <input
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={registration.phone}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    phone: normalizeDigits(event.target.value).slice(0, 11),
                  }))
                }
                placeholder="09121234567"
                required
              />
            </label>
            <label>
              رمز عبور
              <input
                dir="ltr"
                type="password"
                autoComplete="new-password"
                value={registration.password}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                minLength={6}
                required
              />
            </label>
            <label>
              تکرار رمز عبور
              <input
                dir="ltr"
                type="password"
                autoComplete="new-password"
                value={registration.passwordConfirmation}
                onChange={(event) =>
                  setRegistration((current) => ({
                    ...current,
                    passwordConfirmation: event.target.value,
                  }))
                }
                minLength={6}
                required
              />
            </label>
            <button className="primary-btn" disabled={busy}>
              {busy ? "در حال ساخت حساب..." : "ساخت حساب و ورود"}
            </button>
            <small>شماره همراه هر حساب باید یکتا باشد.</small>
          </form>
        ) : authMode === "password" ? (
          <form className="otp-form" onSubmit={submitPassword}>
            <div className="otp-heading">
              <span>حساب کاربری</span>
              <h1>ورود با رمز عبور</h1>
              <p>شماره همراه و رمز عبور حساب خود را وارد کنید.</p>
            </div>
            <label>
              شماره همراه
              <input
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(normalizeDigits(event.target.value).slice(0, 11))
                }
                placeholder="09121234567"
                autoFocus
                required
              />
            </label>
            <label>
              رمز عبور
              <input
                dir="ltr"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            <button className="primary-btn" disabled={busy}>
              {busy ? "در حال ورود..." : "ورود به حساب"}
            </button>
            <small>
              رمز ندارید یا فراموشش کرده‌اید؟ از تب «ورود با کد» استفاده کنید.
            </small>
          </form>
        ) : step === "phone" ? (
          <form className="otp-form" onSubmit={submitPhone}>
            <div className="otp-heading">
              <span>حساب کاربری</span>
              <h1>ورود یا ثبت‌نام</h1>
              <p>شماره همراهتان را وارد کنید تا کد ورود برای شما پیامک شود.</p>
            </div>
            <label>
              شماره همراه
              <input
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(normalizeDigits(event.target.value).slice(0, 11))
                }
                placeholder="09121234567"
                autoFocus
              />
            </label>
            <button className="primary-btn" disabled={busy}>
              {busy ? "در حال ارسال..." : "دریافت کد ورود"}
            </button>
            <small>
              اگر قبلاً حساب نداشته باشید، حساب شما خودکار ساخته می‌شود.
            </small>
          </form>
        ) : (
          <form className="otp-form" onSubmit={submitCode}>
            <div className="otp-heading">
              <span>تأیید شماره همراه</span>
              <h1>کد پیامک‌شده را وارد کنید</h1>
              <p dir="rtl">
                کد ۶ رقمی به <b dir="ltr">{phone}</b> ارسال شد.
              </p>
            </div>
            <label>
              کد تأیید
              <input
                className="otp-code-input"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(normalizeDigits(event.target.value).slice(0, 6))
                }
                placeholder="ــــــ"
                autoFocus
              />
            </label>
            <button className="primary-btn" disabled={busy}>
              {busy ? "در حال بررسی..." : "تأیید و ورود"}
            </button>
            <div className="otp-actions">
              <button
                type="button"
                onClick={sendCode}
                disabled={busy || countdown > 0}
              >
                {countdown > 0
                  ? `ارسال دوباره تا ${countdown.toLocaleString("fa-IR")} ثانیه`
                  : "ارسال دوباره کد"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                }}
                disabled={busy}
              >
                ویرایش شماره
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
      <div className="profile-sections">
        <form className="profile-form" onSubmit={save}>
          <h2>
            {user.profileCompleted === false ? "تکمیل اطلاعات" : "اطلاعات شخصی"}
          </h2>
          <label>
            نام
            <input
              name="firstName"
              defaultValue={
                user.profileCompleted === false ? "" : user.firstName
              }
              minLength={2}
              required
            />
          </label>
          <label>
            نام خانوادگی
            <input
              name="lastName"
              defaultValue={
                user.profileCompleted === false ? "" : user.lastName
              }
              minLength={2}
              required
            />
          </label>
          <label className="profile-phone">
            شماره همراه تأییدشده
            <input dir="ltr" value={user.phone} readOnly />
            <small>تغییر شماره همراه نیازمند تأیید مجدد است.</small>
          </label>
          <button className="primary-btn" disabled={busy}>
            {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </form>
        <form className="profile-form" onSubmit={savePassword}>
          <h2>رمز عبور</h2>
          <p className="password-help">
            اگر با کد یک‌بارمصرف وارد شده‌اید، واردکردن رمز فعلی لازم نیست.
          </p>
          <label className="password-current">
            رمز عبور فعلی (اختیاری برای ورود با کد)
            <input
              dir="ltr"
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              minLength={6}
            />
          </label>
          <label>
            رمز عبور جدید
            <input
              dir="ltr"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <label>
            تکرار رمز عبور جدید
            <input
              dir="ltr"
              type="password"
              name="passwordConfirmation"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          <button className="primary-btn" disabled={busy}>
            {busy ? "در حال ذخیره..." : "ذخیره رمز عبور"}
          </button>
        </form>
      </div>
  );
}
