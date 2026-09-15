# Oner Shop Backend

The Oner Shop API is a NestJS application backed by PostgreSQL and Prisma. It serves the customer storefront and the administration panel from the shared Oner monorepo.

## Stack

- NestJS and TypeScript
- PostgreSQL and Prisma ORM
- JWT authentication for administrators and customers
- Swagger documentation at `/api/docs`
- Local file uploads under `/uploads`
- Telegram low-stock notifications
- SMS one-time-password login for customers
- Saved customer address book with mandatory postal codes
- Online payments through ZarinPal, with a local mock gateway

## Local Setup

Run commands from the monorepo root unless noted otherwise.

```bash
cp apps/shop-backend/.env.example apps/shop-backend/.env
docker compose -f apps/shop-backend/docker-compose.yml up -d
npm install
npm run db:migrate -w shop-backend
npm run dev:api
```

The API is available at `http://localhost:5000/api` and Swagger at `http://localhost:5000/api/docs`.

## Database

The PostgreSQL connection is configured through `DATABASE_URL`. Prisma owns the schema and migrations in `prisma/`.

```bash
# Create a development migration
npm run db:migrate -w shop-backend

# Apply committed migrations in production
npm run db:deploy -w shop-backend

# Inspect local data
npm run db:studio -w shop-backend
```

The data model includes users, addresses, nested categories, products, color/size variants, carts, orders, banners, coupons, contact messages, newsletter subscriptions, and store settings.

## Main API Areas

- Customer authentication: `/api/auth`
- Public products: `/api/products`
- Public categories: `/api/categories`
- Public banners: `/api/banners`
- Cart: `/api/cart`
- Customer orders: `/api/orders`
- Customer addresses: `/api/addresses`
- Payment request and callback: `/api/payments`
- Administration: `/api/admin/*`

Administrative endpoints require a valid administrator Bearer token.

## Customer SMS Login

The storefront uses these endpoints:

- `POST /api/auth/otp/request` with `{ "phone": "09121234567" }`
- `POST /api/auth/otp/verify` with `{ "phone": "09121234567", "code": "123456" }`

In local development, `SMS_PROVIDER=console` writes the code to the API log. This mode is rejected when `NODE_ENV=production`. For production, create an SMS.ir fast-send template with a code parameter and configure:

```dotenv
SMS_PROVIDER=smsir
SMSIR_API_KEY=...
SMSIR_TEMPLATE_ID=123456
SMSIR_CODE_PARAMETER=Code
OTP_PEPPER=a-separate-random-secret-of-at-least-32-characters
```

Codes expire after two minutes by default, can be requested again after one minute, are stored only as keyed hashes, and are rate-limited by both phone number and client IP. A verified phone creates a customer account automatically when needed. Administrator login remains email/password only.

## Online Payments

Cash on delivery is not supported. Local development uses a mock payment page that exercises the complete request, redirect, callback, verification, and retry flow without charging a card:

```dotenv
PAYMENT_PROVIDER=mock
PAYMENT_CALLBACK_BASE_URL=http://127.0.0.1:5000
STOREFRONT_URL=http://localhost:3000
```

For production, set `PAYMENT_PROVIDER=zarinpal`, configure the public API and storefront URLs, and provide the merchant UUID in `ZARINPAL_MERCHANT_ID`. `PAYMENT_PROVIDER=mock` is rejected when `NODE_ENV=production`.

## Seed Data

Seeding is opt-in. Set `SEED_ADMIN=true` to synchronize the administrator from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_PHONE`. Set `SEED_DEMO=true` only in a disposable local environment to create demo catalog and customer data. Demo data is disabled in production by default.

## Production Notes

- Run `prisma migrate deploy` before starting the compiled API.
- Mount `uploads/` and the PostgreSQL data directory to persistent storage.
- Schedule PostgreSQL backups independently of the container volume.
- Keep `DATABASE_URL`, `JWT_SECRET`, `OTP_PEPPER`, SMS.ir credentials, ZarinPal credentials, administrator credentials, and Telegram credentials outside Git.
