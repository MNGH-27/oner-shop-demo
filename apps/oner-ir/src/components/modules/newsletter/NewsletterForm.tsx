"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "@core/services/http/api-client";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/engagement/newsletter", { email });
      setEmail("");
      toast.success("عضویت شما در خبرنامه ثبت شد");
    } catch {
      toast.error("ایمیل معتبر وارد کنید یا دوباره تلاش کنید");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <input
        type="email"
        required
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="ایمیل شما"
        aria-label="ایمیل"
      />
      <button disabled={submitting}>{submitting ? "..." : "عضویت"}</button>
    </form>
  );
}
