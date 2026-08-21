# Oner Shop

**Oner Shop** is an e-commerce monorepo containing the customer storefront, administration panel, and central API. All three applications are maintained in one repository using **npm workspaces**, providing a consistent workflow for dependency management, development, builds, and deployment.

## Monorepo Structure

```text
oner-shop/
├── apps/
│   ├── oner-ir/              # Customer-facing storefront
│   ├── shop-admin-panel/     # Administration panel
│   └── shop-backend/         # API and business logic
├── package.json              # Root scripts and workspaces
├── render.yaml               # Demo API deployment configuration
└── DEPLOYMENT.md             # Deployment guide
```

### Applications

- **Oner Storefront** — `apps/oner-ir`, built with Next.js, React, and TypeScript
- **Admin Panel** — `apps/shop-admin-panel`, built with React, Vite, Tailwind CSS, and TypeScript
- **Backend API** — `apps/shop-backend`, built with NestJS, Prisma, and PostgreSQL

## Storefront Features

- Responsive homepage with admin-managed banners
- Nested category navigation
- Product listing, search, and filtering by category, availability, and price range
- Product detail pages with image galleries, rich descriptions, and related products
- Color and size selection with independent inventory for each variant
- Product discounts and final-price calculation
- Quick product preview
- Shopping cart with variant-level stock limits
- Coupon codes with minimum purchase, expiration date, and maximum discount amount
- Customer registration, authentication, and profile area
- Contact page for custom or unavailable-product requests

## Admin Panel Features

- Secure admin authentication and JWT-protected routes
- Responsive Persian administration dashboard
- Product, image, price, discount, and visibility management
- Custom color and size definitions with inventory per combination
- Low-stock alert thresholds for products and variants
- Rich product descriptions and related-product management
- Nested parent and child category management
- Order management and status changes, including delivered orders
- User management with access to each customer's orders
- Storefront banner management
- Coupon management with Persian date selection
- Toast notifications for successful operations and field-level validation errors

## Backend Features

- REST API powered by NestJS
- PostgreSQL database with Prisma ORM
- JWT authentication with admin and customer roles
- Request validation using `class-validator`
- Independent inventory tracking for each color and size combination
- Stock validation for cart and order quantities
- Demo seed data including an administrator, customers, categories, products, banners, and coupons
- Uploaded file delivery through `/uploads`
- Telegram notifications when inventory reaches a configured threshold
- Swagger documentation at `/api/docs`
- Configurable CORS for the storefront and admin panel

## Requirements

- Node.js 22 or 24
- npm
- Docker or Podman for local PostgreSQL

## Local Development

### 1. Install Dependencies

Install all workspace dependencies from the repository root:

```bash
npm install
```

### 2. Start PostgreSQL

Using Docker:

```bash
docker compose -f apps/shop-backend/docker-compose.yml up -d
```

Using Podman:

```bash
podman compose -f apps/shop-backend/docker-compose.yml up -d
```

### 3. Configure Environment Variables

Copy the example files:

```bash
cp apps/shop-backend/.env.example apps/shop-backend/.env
cp apps/oner-ir/.env.example apps/oner-ir/.env.local
cp apps/shop-admin-panel/.env.example apps/shop-admin-panel/.env
```

The primary backend database variable is:

```env
DATABASE_URL=postgresql://oner:YOUR_PASSWORD@127.0.0.1:5432/oner_shop?schema=public
```

Real `.env` files must never be committed to Git.

### 4. Create the Database Tables

```bash
npm run db:migrate -w shop-backend
```

### 5. Start All Applications

```bash
npm run dev
```

The applications will be available at:

- Storefront: `http://localhost:3000`
- Admin panel: `http://localhost:5173`
- API: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api/docs`

## Starting Applications Individually

```bash
npm run dev:store
npm run dev:admin
npm run dev:api
```

## Useful Commands

```bash
# Build all applications
npm run build

# Build individual applications
npm run build:store
npm run build:admin
npm run build:api

# Open Prisma Studio
npm run db:studio -w shop-backend

# Apply migrations in a deployment environment
npm run db:deploy -w shop-backend

# Run backend tests
npm run test:api
```

## Data Storage

PostgreSQL can run alongside the applications on the same production server. The provided Docker Compose configuration creates a persistent database volume, ensuring data survives container recreation. A production environment should also include scheduled `pg_dump` backups in addition to persistent storage.

During development, product images are stored in `apps/shop-backend/uploads`. In production, this directory must be mounted to persistent server storage or replaced with an object-storage service.

## Demo Deployment

Instructions for deploying the storefront and admin panel to Vercel and the API to Render are available in [DEPLOYMENT.md](./DEPLOYMENT.md). These settings are intended for customer demonstrations and are not a replacement for a production architecture and backup strategy.

## Security Notes

- Store the database password, `JWT_SECRET`, and Telegram token only in environment variables.
- Never place real credentials in `.env.example` files or Git.
- Change the default administrator password before deployment.
- Do not expose PostgreSQL directly to the public network.
- HTTPS, restricted CORS, and regular backups are required in production.
