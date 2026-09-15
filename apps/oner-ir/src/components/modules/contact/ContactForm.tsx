"use client";
import { yupResolver } from "@hookform/resolvers/yup";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import * as yup from "yup";
import { Button } from "@components/ui/Button";
import { Input } from "@components/ui/Input";
import { apiClient } from "@core/services/http/api-client";

const schema = yup.object({
  name: yup.string().trim().required("نام و نام خانوادگی را وارد کنید"),
  phone: yup
    .string()
    .matches(/^09\d{9}$/, "شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد")
    .required("شماره همراه را وارد کنید"),
  subject: yup.string().required(),
  message: yup
    .string()
    .trim()
    .min(10, "توضیحات باید حداقل ۱۰ کاراکتر باشد")
    .required("توضیحات را وارد کنید"),
});
type ContactValues = yup.InferType<typeof schema>;

export function ContactForm({
  request,
}: {
  request?: {
    subject?: string;
    product?: string;
    color?: string;
    size?: string;
  };
}) {
  const requestMessage = request?.product
    ? `درخواست اطلاع‌رسانی موجودی برای محصول «${request.product}»${request.color ? `، رنگ ${request.color}` : ""}${request.size ? `، سایز ${request.size}` : ""}.`
    : "";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      subject: request?.subject || "راهنمای خرید",
      message: requestMessage,
    },
  });
  const submit = async (values: ContactValues) => {
    try {
      await apiClient.post("/engagement/contact", values);
      toast.success("پیام شما ثبت شد و به‌زودی با شما تماس می‌گیریم");
      reset();
    } catch {
      toast.error("ثبت پیام انجام نشد؛ لطفاً دوباره تلاش کنید");
    }
  };
  return (
    <form className="contact-form" onSubmit={handleSubmit(submit)} noValidate>
      <h2>پیام شما</h2>
      <label>
        نام و نام خانوادگی
        <Input {...register("name")} />
        {errors.name ? (
          <span className="field-error">{errors.name.message}</span>
        ) : null}
      </label>
      <label>
        شماره همراه
        <Input
          {...register("phone")}
          inputMode="tel"
          placeholder="۰۹۱۲۱۲۳۴۵۶۷"
        />
        {errors.phone ? (
          <span className="field-error">{errors.phone.message}</span>
        ) : null}
      </label>
      <label>
        موضوع
        <select {...register("subject")}>
          <option>راهنمای خرید</option>
          <option>درخواست موجودی</option>
          <option>پیگیری سفارش</option>
          <option>محصول سفارشی</option>
        </select>
      </label>
      <label>
        توضیحات
        <textarea {...register("message")} rows={5} />
        {errors.message ? (
          <span className="field-error">{errors.message.message}</span>
        ) : null}
      </label>
      <Button type="submit" className="primary-btn" disabled={isSubmitting}>
        <Send size={17} /> ارسال پیام
      </Button>
      <small>
        اطلاعات شما فقط برای پاسخ‌گویی به همین درخواست استفاده می‌شود.
      </small>
    </form>
  );
}
