# KKN Inventory

Inventory and logistics management app for KKN (community service) activities. Built with **Next.js 16** as a full-stack application and **PostgreSQL** as the database.

## Features

| Feature | Description |
|---------|-------------|
| **Item Management** | CRUD, filtering, search, condition & stock status |
| **Categories & Locations** | Manage item categories and storage locations |
| **Events & Programs** | Log activities, item requirements, preparation status |
| **Borrowing** | Lending to others, borrowing from others, overdue detection |
| **Stock Transactions** | In/out stock with database transactions |
| **Reports** | CSV export (inventory, loans, transactions, activity) |
| **Calendar** | Monthly grid view of events and programs |
| **Authentication** | Login/register, JWT sessions, user validation |
| **QR Code** | Unique QR per item for quick access |
| **Profile** | Edit profile, change password, upload avatar (Supabase Storage) |
| **Dark Mode** | Light & dark theme support |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | [Prisma 7](https://www.prisma.io/) |
| **Auth** | [Auth.js v5](https://authjs.dev/) |
| **UI** | [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS |
| **Icons** | [Lucide](https://lucide.dev/) |

## Requirements

- Node.js 20+
- PostgreSQL (or Supabase)

## Installation

```bash
git clone https://github.com/andremarthinusl/kkn-inventory.git
cd kkn-inventory

npm install
cp .env.example .env
# Edit .env with your database credentials

npx prisma db push
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register a new account.

> **Note:** After registration, accounts need to be validated (`validated = 1`) to log in. Run `npx prisma studio` → `users` table → set `validated` to `1`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register
│   ├── (dashboard)/      # Dashboard, Items, Events, etc.
│   └── api/              # API Routes (auth, avatar)
├── components/ui/        # shadcn/ui components
├── lib/                  # Prisma, Auth, Utils, Validation
├── actions/              # Server Actions
└── generated/prisma/     # Prisma Client (auto-generated)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (with pgbouncer) |
| `DIRECT_URL` | ✅ | Direct PostgreSQL URL (without pgbouncer) |
| `AUTH_SECRET` | ✅ | Secret key for JWT |
| `SUPABASE_URL` | ❌ | Supabase project URL (for avatar upload) |
| `SUPABASE_ANON_KEY` | ❌ | Supabase anon key |

## License

MIT
