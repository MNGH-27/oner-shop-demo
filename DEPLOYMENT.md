# استقرار روی یک سرور ابری لیارا

کل سامانه روی یک Ubuntu Server و با Docker Compose اجرا می‌شود:

- فروشگاه Next.js روی پورت عمومی `80`
- پنل مدیریت روی پورت عمومی `8080`
- API روی پورت عمومی `5000`
- PostgreSQL فقط داخل شبکه Docker
- Volume دائمی برای دیتابیس و تصاویر

## منابع تست

سرور فعلی با ۱ CPU، رم ۲GB و دیسک ۲۰GB برای تست اولیه قابل استفاده است. اسکریپت
آماده‌سازی ۲GB Swap می‌سازد و CI سرویس‌ها را با محدودیت موازی‌سازی build می‌کند.
برای Production حداقل ۲ CPU، رم ۴GB و دیسک ۴۰GB توصیه می‌شود.

## ۱. اتصال امن

در پنل لیارا وارد بخش «اتصال» سرور شوید و IP و نام کاربری را یادداشت کنید. ورود
با SSH Key به رمز عبور ترجیح دارد. کلید خصوصی را در چت یا مخزن قرار ندهید.

## ۲. آماده‌سازی Ubuntu

فایل `deploy/bootstrap-ubuntu.sh` را روی سرور اجرا کنید. این اسکریپت Docker،
Compose، فایروال، Swap و مسیر `/opt/oner-shop` را آماده می‌کند. اسکریپت باید با
دسترسی root اجرا شود.

پورت‌های بازشده:

- `22`: اتصال SSH
- `80`: فروشگاه
- `5000`: API
- `8080`: پنل مدیریت

پورت PostgreSQL عمومی نمی‌شود.

## ۳. تنظیم محیط سرور

فایل `deploy/server.env.example` را روی سرور با نام زیر کپی کنید:

```text
/opt/oner-shop/.env.production
```

تمام موارد `SERVER_IP` را با IP واقعی سرور جایگزین و رمزهای تصادفی، SMS.ir و
مشخصات مدیر را وارد کنید. این فایل فقط روی سرور می‌ماند و CI آن را حذف یا
جایگزین نمی‌کند.

برای ساخت مقدارهای تصادفی می‌توان دو بار دستور زیر را اجرا کرد:

```bash
openssl rand -hex 32
```

مقادیر خروجی باید برای `JWT_SECRET`، `OTP_PEPPER` و `POSTGRES_PASSWORD` مستقل
باشند.

## ۴. تنظیم GitHub

در مخزن GitHub یک Environment با نام `production` بسازید و این Secretها را ثبت
کنید:

```text
SERVER_HOST=IP سرور
SERVER_USER=نام کاربری SSH
SERVER_SSH_KEY=کلید خصوصی SSH مخصوص استقرار
```

اگر SSH روی پورت دیگری است، Variable زیر را اضافه کنید:

```text
SERVER_PORT=22
```

## ۵. CI/CD

فایل `.github/workflows/ci-cd.yml` در Pull Request تست، lint و build را اجرا
می‌کند. بعد از Push موفق به `main`، GitHub imageهای Docker را می‌سازد و در GHCR
قرار می‌دهد. سپس فایل‌های استقرار با SSH به `/opt/oner-shop` منتقل می‌شوند و
سرور imageهای آماده را دریافت می‌کند. به این ترتیب سرور ایران به Docker Hub
وابسته نیست و فشار build روی سرور ۲GB وارد نمی‌شود.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
```

در انتها مسیر `/api/health` بررسی و imageهای بدون استفاده پاک می‌شوند تا دیسک
۲۰GB سریع پر نشود.

Variable زیر نیز باید در GitHub Environment ثبت شود:

```text
PUBLIC_SERVER_ORIGIN=http://SERVER_IP
```

## ۶. آدرس‌های تست بدون دامنه

```text
فروشگاه: http://SERVER_IP
پنل مدیریت: http://SERVER_IP:8080
API: http://SERVER_IP:5000/api
Swagger: http://SERVER_IP:5000/api/docs
Health: http://SERVER_IP:5000/api/health
```

پرداخت در این مرحله روی `mock` می‌ماند. برای زرین‌پال واقعی و HTTPS بهتر است
بعداً دامنه متصل و Nginx به‌همراه گواهی SSL تنظیم شود.

## ۷. بکاپ

داده‌های PostgreSQL و تصاویر در Volumeهای Docker نگهداری می‌شوند، ولی Volume
به‌تنهایی بکاپ نیست. Snapshot زمان‌بندی‌شده سرور را در لیارا فعال کنید و پیش از
فعال‌کردن پرداخت واقعی، بکاپ جداگانه PostgreSQL نیز اضافه شود.
