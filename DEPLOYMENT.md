# استقرار آزمایشی Oner

این مخزن شامل سه برنامه است:

- `apps/oner-ir`: فروشگاه Next.js
- `apps/shop-admin-panel`: پنل مدیریت Vite/React
- `apps/shop-backend`: API با NestJS

## ۱. پایگاه داده

پروژه از PostgreSQL استفاده می‌کند. در نسخه دمو یک PostgreSQL قابل دسترس بسازید و رشته اتصال را با نام `DATABASE_URL` تنظیم کنید. در سرور نهایی می‌توان PostgreSQL را با فایل `apps/shop-backend/docker-compose.yml` و Volume دائمی روی همان سرور اجرا کرد.

## ۲. بک‌اند در Render

در Render گزینه Blueprint را انتخاب و همین مخزن را متصل کنید. فایل `render.yaml` سرویس را می‌سازد. هنگام ساخت، متغیرهای زیر را وارد کنید:

- `DATABASE_URL`: رشته اتصال PostgreSQL
- `ADMIN_EMAIL`: ایمیل ورود مدیر
- `ADMIN_PASSWORD`: رمز قوی مدیر
- `ADMIN_PANEL_URL`: آدرس نهایی پنل در Vercel
- `CORS_ORIGINS`: آدرس فروشگاه و پنل، جداشده با ویرگول
- `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID`: اختیاری برای اعلان تلگرام

## ۳. فروشگاه در Vercel

مخزن را به‌عنوان پروژه جدید وارد کنید و Root Directory را روی `apps/oner-ir` بگذارید. سپس این متغیرها را تنظیم کنید:

- `NEXT_PUBLIC_API_URL=https://...onrender.com/api`
- `NEXT_PUBLIC_MEDIA_URL=https://...onrender.com`

## ۴. پنل مدیریت در Vercel

همین مخزن را بار دیگر به‌عنوان پروژه جدا وارد کنید و Root Directory را روی `apps/shop-admin-panel` بگذارید. متغیرها:

- `VITE_API_BASE_URL=https://...onrender.com/api`
- `VITE_MEDIA_BASE_URL=https://...onrender.com`

پس از ساخته‌شدن پنل، آدرس آن را در `ADMIN_PANEL_URL` و همراه آدرس فروشگاه در `CORS_ORIGINS` سرویس Render ثبت و بک‌اند را دوباره Deploy کنید.

## محدودیت نسخه دمو

فایل‌های آپلودشده روی دیسک سرویس رایگان Render دائمی نیستند و ممکن است بعد از استقرار مجدد حذف شوند. تصاویر اولیه داخل مخزن باقی می‌مانند؛ برای نسخه نهایی باید فضای ذخیره‌سازی مانند S3 یا Cloudinary متصل شود.
