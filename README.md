# Oner Shop Monorepo

این مخزن شامل سه برنامه فروشگاه Oner است:

- `apps/oner-ir`: سایت اصلی فروشگاه با Next.js
- `apps/shop-admin-panel`: پنل مدیریت با React و Vite
- `apps/shop-backend`: API فروشگاه با NestJS و MongoDB

## نصب وابستگی‌ها

```bash
npm install
```

## اجرای هم‌زمان پروژه‌ها

```bash
npm run dev
```

- سایت فروشگاه: `http://localhost:3000`
- پنل مدیریت: `http://localhost:5173`
- API: `http://localhost:5000/api`

## اجرای جداگانه

```bash
npm run dev:store
npm run dev:admin
npm run dev:api
```

## ساخت هر سه پروژه

```bash
npm run build
```

فایل‌های `.env` هر برنامه داخل همان پوشه برنامه نگهداری می‌شوند و نباید commit شوند. نمونه متغیرها در فایل `.env.example` هر برنامه قرار دارد.
