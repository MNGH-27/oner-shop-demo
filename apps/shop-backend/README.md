# Shop Backend

NestJS + MongoDB backend for an e-commerce shop.

## Stack

- NestJS (modular)
- MongoDB + Mongoose
- JWT Auth (Admin + Customer)
- Swagger (`/api/docs`)

## Setup

```bash
cp .env.example .env
docker compose up -d   # MongoDB
npm install
npm run start:dev
```

Default admin (created on first boot if missing):

- Email: `admin@shop.local`
- Password: `Admin@123456`

## Customer APIs

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PATCH /api/auth/me` |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:productId`, `DELETE /api/cart` |
| Orders | `POST /api/orders/checkout`, `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/cancel` |

## Admin APIs

All admin routes are under `/api/admin/...` (Bearer JWT required).

### Categories
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/categories` | Create |
| GET | `/admin/categories` | List (`search`, `parent`, `onlyActive`) |
| GET | `/admin/categories/tree` | Nested tree |
| GET/PATCH/DELETE | `/admin/categories/:id` | Detail / update / delete |

### Products
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/products` | Create (price/stock optional) |
| GET | `/admin/products` | List |
| PATCH | `/admin/products/:id` | Update info (not price/stock) |
| PATCH | `/admin/products/:id/price` | **Set price** |
| PATCH | `/admin/products/:id/stock` | **Set stock quantity** |
| PATCH | `/admin/products/:id/stock/adjust` | Adjust stock by delta |
| DELETE | `/admin/products/:id` | Delete |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/orders/stats` | Overview stats |
| GET | `/admin/orders` | List (`status`, `paymentStatus`, `search`, `userId`) |
| GET | `/admin/orders/:id` | Detail |
| PATCH | `/admin/orders/:id/status` | Change status |
| PATCH | `/admin/orders/:id/payment-status` | Change payment |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users/stats` | Overview stats |
| GET | `/admin/users` | List (`role`, `search`, `isActive`) |
| GET/PATCH/DELETE | `/admin/users/:id` | Detail / update / delete |
| PATCH | `/admin/users/:id/active` | Activate / deactivate |

## MongoDB collections

- `users` — admins & customers
- `categories` — product categories (nested via `parent`)
- `products` — catalog items
- `carts` — one cart per customer
- `orders` — customer orders

## Flow (customer)

1. Register / login → JWT
2. Add products to cart
3. Checkout with shipping address → order created, stock decreased, cart cleared
4. Track / cancel (pending|confirmed) orders

## Next steps (planned)

1. Public catalog APIs
2. Payment integration
3. Address book CRUD for customers
4. Image upload
