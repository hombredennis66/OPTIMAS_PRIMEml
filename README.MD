# OPTIMAS_PRIMEml

OPTIMAS_PRIMEml is a TypeScript-based web application for machine learning utilities, built with [TanStack Start](https://tanstack.com/start/latest), [React](https://react.dev/), and [Supabase](https://supabase.com/).

## Features

- **Authentication** — Supabase Auth with email/password sign-up and sign-in
- **Dashboard** — Authenticated user dashboard for ML workflows
- **Admin Panel** — Administrative interface for project management
- **Survey System** — Data collection with structured survey forms
- **Audit Logging** — Track all user actions with detailed audit trails
- **ML Predictions** — Prediction utilities and model management
- **SSR** — Server-side rendering via TanStack Start + Nitro (Cloudflare Workers target)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [TanStack Start](https://tanstack.com/start/latest) | Full-stack React framework |
| [TanStack Router](https://tanstack.com/router/latest) | File-based routing |
| [TanStack React Query](https://tanstack.com/query/latest) | Data fetching & caching |
| [Supabase](https://supabase.com/) | Auth, database, and backend |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [Radix UI](https://www.radix-ui.com/) | Accessible UI components |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Nitro](https://nitro.build/) | Server engine (Cloudflare Workers) |
| [Vitest](https://vitest.dev/) | Unit testing |
| [Playwright](https://playwright.dev/) | E2E testing |

## Requirements

- **Node.js 18+**
- **Bun** (recommended, 3x faster than npm) — [Install Bun](https://bun.sh/docs/installation)
  - Or use npm as fallback

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/hombredennis66/OPTIMAS_PRIMEml.git
cd OPTIMAS_PRIMEml
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in values from your [Supabase Dashboard](https://app.supabase.com):
- Go to **Project Settings → API**
- Copy `Project URL` → `SUPABASE_URL` and `VITE_SUPABASE_URL`
- Copy `Project ID` → `SUPABASE_PROJECT_ID` and `VITE_SUPABASE_PROJECT_ID`
- Copy `anon/public` key → `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. Install dependencies

```bash
# Using Bun (recommended)
bun install

# Using npm (fallback)
npm install
```

### 4. Start development

```bash
bun run dev
# or: npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

## Environment Variables

| Variable | Required | Purpose | Where to Find |
|----------|----------|---------|---------------|
| `SUPABASE_URL` | ✅ | Supabase backend URL | Project Settings → API |
| `SUPABASE_PROJECT_ID` | ✅ | Supabase project identifier | Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon key (server-side) | Project Settings → API |
| `VITE_SUPABASE_URL` | ✅ | Client-side Supabase URL | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | Client-side project ID | Same as `SUPABASE_PROJECT_ID` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Client-side anon key | Same as `SUPABASE_PUBLISHABLE_KEY` |

> ⚠️ **Never commit `.env` to git!** Use `.env.example` for templates and manage secrets via GitHub Secrets (CI/CD) or Cloudflare Environment Variables (production).

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |
| `bun run test` | Run unit tests (Vitest, watch mode) |
| `bun run test:run` | Run unit tests once |
| `bun run test:ui` | Vitest UI mode |
| `bun run test:e2e` | Run E2E tests (Playwright) |
| `bun run test:e2e:ui` | Playwright UI mode |

## Project Structure

```
src/
├── components/ui/       # Radix-based UI components
├── hooks/               # Custom React hooks
├── integrations/        # Supabase & Lovable clients
│   ├── lovable/         # Lovable platform integration
│   └── supabase/        # Supabase client & types
├── lib/                 # Utilities & shared logic
│   ├── auditLogger.ts   # Audit logging to Supabase
│   ├── error-page.ts    # SSR error page renderer
│   ├── prediction.ts    # ML prediction utilities
│   ├── survey-schema.ts # Zod survey validation
│   └── utils.ts         # General utilities
├── routes/              # File-based routes (TanStack Router)
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Homepage (/)
│   ├── auth.tsx         # Auth page (/auth)
│   └── _authenticated/  # Protected routes
│       ├── route.tsx    # Auth guard layout
│       ├── dashboard.tsx # Dashboard (/dashboard)
│       ├── admin.tsx    # Admin panel (/admin)
│       └── survey.tsx   # Survey form (/survey)
├── test/                # Test setup
├── router.tsx           # Router configuration
├── server.ts            # SSR entry point (error wrapper)
├── start.ts             # TanStack Start entry
└── styles.css           # Global styles (Tailwind)

supabase/
└── migrations/          # Database migration files

docs/
├── API.md               # API documentation
└── DATABASE.md          # Database schema & migrations

e2e/                     # Playwright E2E tests
```

## Deployment

### Cloudflare Pages (Recommended)

1. Connect GitHub repository to [Cloudflare Pages](https://pages.cloudflare.com)
2. Set environment variables in Cloudflare dashboard
3. Push to `main` branch to auto-deploy

### Manual Deployment

```bash
npm install -g wrangler
bun run build
wrangler deploy
```

### CI/CD

GitHub Actions are configured for:
- **CI** (`.github/workflows/ci.yml`): Lint, typecheck, unit tests, E2E tests on PRs
- **Deploy** (`.github/workflows/deploy.yml`): Auto-deploy to Cloudflare Pages on push to `main`

## Contributing

Contributions, issues, and feature requests are welcome:

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Open a Pull Request describing the change

> **Important:** Do not rewrite published git history (no force-pushes or rebasing/amending already-pushed commits). This repository is connected to Lovable, which depends on preserved history.

## License

MIT License — Copyright (c) 2026 Dennis

See [LICENSE](LICENSE) for full text.
