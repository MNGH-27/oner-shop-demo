"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function secondsUntil(value: string, now: number) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - now) / 1000));
}

export function ReservationTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const notified = useRef(false);

  useEffect(() => {
    notified.current = false;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const seconds = secondsUntil(expiresAt, now);

  useEffect(() => {
    if (seconds > 0 || notified.current) return;
    notified.current = true;
    onExpire?.();
  }, [onExpire, seconds]);

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const time = `${minutes.toLocaleString("fa-IR")}:${rest.toString().padStart(2, "0")}`;
  return (
    <div className={`reservation-timer ${seconds === 0 ? "expired" : ""}`}>
      <Clock3 size={16} />
      {seconds > 0 ? (
        <span>
          زمان باقی‌مانده پرداخت: <b dir="ltr">{time}</b>
        </span>
      ) : (
        <span>مهلت پرداخت تمام شده است</span>
      )}
    </div>
  );
}
