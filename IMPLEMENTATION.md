# OPTIMAS_PRIMEml: Implementation Roadmap

This document outlines all recommended upgrades and improvements for the OPTIMAS_PRIMEml project. Use this as a checklist to systematically improve code quality, security, deployment readiness, and maintainability.

---

## 📋 Table of Contents

1. [Critical / High Priority](#critical--high-priority)
2. [Medium Priority](#medium-priority)
3. [Low Priority / Nice-to-Have](#low-priority--nice-to-have)
4. [Quick Wins (Do These First)](#-quick-wins-do-these-first)
5. [Hosting Recommendation](#hosting-recommendation)
6. [Implementation Timeline](#implementation-timeline)

---

## Critical / High Priority

These items **must** be addressed before production deployment.

### 1. ⚠️ Security: Expose Credentials in `.env`

**Status:** 🔴 Not Started

**Issue:** Supabase publishable keys and project IDs are committed to git in `.env` file, visible to anyone with repo access.

**Risk Level:** 🔴 Critical

**Impact:**
- Anyone with GitHub access can access your Supabase project
- Keys in git history are permanent (even if deleted)
- Potential unauthorized database access, data breaches

**Action Items:**
- [ ] Add `.env` to `.gitignore` immediately
- [ ] Run: `git rm --cached .env && git commit -m "Remove .env from tracking"`
- [ ] Rotate all Supabase API keys in [Supabase Dashboard](https://app.supabase.com)
  - Go to Settings → API
  - Click "Rotate" on both `anon` and `service_role` keys
- [ ] Create `.env.example` with placeholder values (see below)
- [ ] Update CI/CD and hosting platform to use environment secrets instead
- [ ] Document all required env vars in README

**Files to Create/Update:**
- `.gitignore` - add `.env` if not present
- `.env.example` - commit this with placeholder values

**Code Example:**

```bash
# 1. Update .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# 2. Remove from git history
git rm --cached .env
git commit -m "Remove .env from tracking for security"

# 3. Verify it worked
git status  # should show .env as untracked
```

**`.env.example` Template:**

```dotenv
# Supabase Configuration (get these from https://app.supabase.com/project/_/settings/api)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

---

### 2. Missing Production Deployment Configuration

**Status:** 🔴 Not Started

**Issue:** Project defaults to Cloudflare Workers target (via Nitro) but has no Wrangler configuration or deployment automation.

**Impact:**
- Cannot deploy to production
- No CI/CD pipeline
- Manual deployment process

**Recommendation:** Deploy to **Cloudflare Pages + Workers**

**Why Cloudflare?**
- Free tier: 100,000 requests/day
- Global edge deployment (300+ data centers)
- Already configured in `vite.config.ts`
- Zero cold starts with Workers
- Sub-100ms latency worldwide
- Supabase integrates seamlessly

**Action Items:**
- [ ] Create `wrangler.toml` configuration file
- [ ] Set up GitHub Actions for automatic deployments
- [ ] Create Cloudflare account and Pages project
- [ ] Document deployment steps in README

**Files to Create:**

**`wrangler.toml`:**

```toml
name = "optimas-primeml"
main = "dist/index.js"
type = "service-worker"
compatibility_date = "2024-01-01"

# Cloudflare Pages deployment settings
pages_build_caching = true

# Environment variables (stored in Cloudflare dashboard)
[env.production]
vars = { ENVIRONMENT = "production" }

[env.development]
vars = { ENVIRONMENT = "development" }

# Route configuration if needed
[[routes]]
pattern = "optimas-primeml.pages.dev/*"
```

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: optimas-primeml
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Setup Steps:**
1. Create Cloudflare account at https://dash.cloudflare.com
2. Navigate to Pages
3. Connect GitHub repository
4. Set build configuration:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Add environment secrets to GitHub (Settings → Secrets):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_PROJECT_ID`
   - `SUPABASE_PUBLISHABLE_KEY`

**Documentation to Add:**

Update README with:
```markdown
## Deployment

### Cloudflare Pages (Recommended)

1. Connect GitHub repository to [Cloudflare Pages](https://pages.cloudflare.com)
2. Set environment variables in dashboard
3. Push to `main` branch to auto-deploy

### Manual Deployment

```bash
npm install -g wrangler
npm run build
wrangler deploy
```
```

---

### 3. Missing Database Migrations in Version Control

**Status:** 🔴 Not Started

**Issue:** `supabase/migrations/` directory is empty; database schema not tracked in git.

**Impact:**
- Cannot reproduce database schema
- No version control for database changes
- Team members cannot set up local Supabase instance

**Action Items:**
- [ ] Pull existing migrations from Supabase project
- [ ] Commit migrations to git
- [ ] Document database schema

**Commands:**

```bash
# 1. Link to Supabase project
supabase link --project-ref wsxvnkejmqksmyoxpxuf

# 2. Pull existing schema as migrations
supabase db pull

# 3. Commit migrations
git add supabase/migrations/
git commit -m "chore: add database migrations"
```

**Files to Create:**

**`docs/DATABASE.md`:**

```markdown
# Database Schema

## Supabase Project

- **Project ID:** wsxvnkejmqksmyoxpxuf
- **Region:** (check dashboard)

## Tables

List all tables, their purpose, and key fields:

- `users` - User profiles and authentication
- `projects` - ML projects/datasets
- `models` - Trained models and metadata

## Running Migrations Locally

```bash
supabase start
supabase migration up
```

## Creating New Migrations

```bash
supabase migration new add_users_table
# Edit supabase/migrations/[timestamp]_add_users_table.sql
supabase migration up
```

## Connecting to Local Postgres

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```
```

---

### 4. TypeScript Configuration Gaps

**Status:** 🟡 Partially Complete

**Issue:** `tsconfig.json` is minimal; strict type checking not enabled. This allows type unsafety.

**Impact:**
- Potential runtime errors from type issues
- Harder to refactor safely
- IDE type hints less effective

**Action Items:**
- [ ] Update `tsconfig.json` with strict settings
- [ ] Fix any type errors that emerge
- [ ] Enable strict ESLint rules

**Update `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",

    // Strict type checking (NEW)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,

    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"],
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

**Commands:**

```bash
# 1. Update config
# (manually edit tsconfig.json with above content)

# 2. Check for type errors
npx tsc --noEmit

# 3. Fix errors as they appear
# Most should be straightforward null-checks or type annotations

# 4. Commit
git add tsconfig.json
git commit -m "chore: enable strict TypeScript checking"
```

---

### 5. Missing Testing Infrastructure

**Status:** 🔴 Not Started

**Issue:** No test runner, no test files, no test automation in CI.

**Impact:**
- Cannot catch regressions
- No confidence in refactoring
- Higher bug rate in production

**Action Items:**
- [ ] Add Vitest for unit tests
- [ ] Add Playwright for E2E tests
- [ ] Create test GitHub Action
- [ ] Write basic tests for critical functions

**Setup Steps:**

```bash
# 1. Install test dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test

# 2. Create vitest config
# (see below)

# 3. Write first test
# (see below)

# 4. Update package.json scripts
```

**Files to Create:**

**`vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**`src/test/setup.ts`:**

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

**Example Test: `src/lib/__tests__/error-page.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { renderErrorPage } from '../error-page';

describe('error-page', () => {
  it('should render error page HTML', () => {
    const html = renderErrorPage();
    expect(html).toContain('500');
    expect(html).toMatch(/<html|<HTML/);
  });
});
```

**`playwright.config.ts`:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Example E2E Test: `e2e/homepage.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test';

test('homepage should load', async ({ page }) => {
  await page.goto('/');
  expect(page).toHaveTitle(/OPTIMAS_PRIMEml/);
});
```

**Update `package.json` scripts:**

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**GitHub Action: `.github/workflows/test.yml`:**

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Medium Priority

These items **should** be completed before wider team adoption or public beta.

### 6. Dependency Updates & Package Manager Consistency

**Status:** 🟡 Partially Complete

**Issue:** Both `bun.lock` and `package-lock.json` exist; unclear which package manager to use.

**Impact:**
- Confusion among team members
- Inconsistent installs
- Version conflicts

**Decision:** ✅ Use **Bun** (faster, modern alternative to npm)

**Why Bun?**
- 3-4x faster than npm
- Better monorepo support
- Built-in bundler compatibility with Vite
- Single binary (easy install)

**Action Items:**
- [ ] Document package manager choice in README
- [ ] Remove `package-lock.json`
- [ ] Keep `bun.lock`
- [ ] Add `.npmrc` or `bunfig.toml` config

**Commands:**

```bash
# 1. Install Bun (if not already)
curl -fsSL https://bun.sh/install | bash

# 2. Verify
bun --version

# 3. Install dependencies with Bun
bun install

# 4. Remove npm lockfile
rm package-lock.json

# 5. Verify bun.lock is up-to-date
git add bun.lock bunfig.toml
git commit -m "chore: consolidate to Bun package manager"
```

**Update `README.md`:**

```markdown
## Requirements

- **Node.js 18+** (or use Bun)
- **Bun** (recommended, 3x faster than npm)
  - Install: `curl -fsSL https://bun.sh/install | bash`
  - Or use npm/yarn as fallback

## Getting Started

### Using Bun (Recommended)

```bash
bun install
bun run dev
bun run build
bun test
```

### Using npm

```bash
npm install
npm run dev
npm run build
npm test
```
```

**Update `.github/workflows/` to use Bun:**

```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v1
  with:
    bun-version: latest

- name: Install dependencies
  run: bun install

- name: Build
  run: bun run build
```

---

### 7. ESLint Rules Need Tightening

**Status:** 🟡 Partially Complete

**Issue:** ESLint config exists but may be too permissive for a production app.

**Impact:**
- Code style inconsistencies
- Potential bugs not caught
- Security issues missed

**Action Items:**
- [ ] Update `eslint.config.js` with stricter rules
- [ ] Add import sorting plugin
- [ ] Add security linting
- [ ] Run lint and fix errors

**Update `eslint.config.js`:**

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import securityPlugin from 'eslint-plugin-security';
import importPlugin from 'eslint-plugin-import';

export default [
  { ignores: ['dist', 'build', 'node_modules'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'typescript-eslint': tseslint.plugin,
      security: securityPlugin,
      import: importPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...securityPlugin.configs.recommended.rules,

      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-types': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],

      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import sorting
      'import/order': ['error', {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        alphabeticalOrder: true,
        caseInsensitive: true
      }],

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  }
];
```

**Install dependencies:**

```bash
bun add -D eslint-plugin-security eslint-plugin-import
```

**Run and fix:**

```bash
npm run lint -- --fix
git add .
git commit -m "chore: tighten ESLint configuration"
```

---

### 8. Missing Environment Documentation

**Status:** 🟡 Partially Complete

**Issue:** No documentation on what environment variables are needed or what they do.

**Impact:**
- New developers cannot set up locally
- Unclear which keys are sensitive
- Deployment failures due to missing vars

**Action Items:**
- [ ] Create `.env.example` (already in #1)
- [ ] Document all env vars in README
- [ ] Add setup script for dev environment

**`.env.example`:**

```dotenv
# ============================================================================
# Supabase Configuration
# Get these from: https://app.supabase.com/project/_/settings/api
# ============================================================================

# Server-side (backend/Node.js only, never expose to client)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PROJECT_ID=your-project-id
SUPABASE_PUBLISHABLE_KEY=eyJhbGc... (anon/public key)

# Client-side (browser, safe to expose)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc... (anon/public key)

# ============================================================================
# Optional: Lovable Integration (if still using)
# ============================================================================
# LOVABLE_API_KEY=your-api-key
```

**Update `README.md`:**

```markdown
## Environment Variables

### Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in values from [Supabase Dashboard](https://app.supabase.com):
   - Go to Project Settings → API
   - Copy `Project URL` → `SUPABASE_URL`
   - Copy `Project ID` → `SUPABASE_PROJECT_ID`
   - Copy `anon/public` key → `SUPABASE_PUBLISHABLE_KEY`

3. Start development:
   ```bash
   bun run dev
   ```

### Required Environment Variables

| Variable | Required | Purpose | Where to Find |
|----------|----------|---------|---|
| `SUPABASE_URL` | ✅ Yes | Supabase backend URL | Project Settings → API |
| `SUPABASE_PROJECT_ID` | ✅ Yes | Supabase project identifier | Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Supabase anon key (public) | Project Settings → API |
| `VITE_SUPABASE_URL` | ✅ Yes | Client-side Supabase URL | Same as SUPABASE_URL |
| `VITE_SUPABASE_PROJECT_ID` | ✅ Yes | Client-side project ID | Same as SUPABASE_PROJECT_ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Client-side anon key | Same as SUPABASE_PUBLISHABLE_KEY |

### Security Note

⚠️ **Never commit `.env` to git!** Use `.env.example` for templates and manage secrets via:
- GitHub Secrets (for CI/CD)
- Cloudflare Environment Variables (for production)
- Local `.env.local` (development only)
```

**Create `scripts/setup-env.sh`:**

```bash
#!/bin/bash

# Quick setup script for development environment

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ Created .env"
  echo ""
  echo "⚠️  Please update .env with your Supabase credentials:"
  echo "   1. Go to https://app.supabase.com"
  echo "   2. Select your project"
  echo "   3. Go to Settings → API"
  echo "   4. Copy Project URL and anon key into .env"
else
  echo "✅ .env already exists"
fi

echo ""
echo "Running: bun install"
bun install

echo ""
echo "✅ Setup complete! Run 'bun run dev' to start"
```

---

### 9. API Documentation

**Status:** 🔴 Not Started

**Issue:** No documentation on server routes, API endpoints, or available functions.

**Impact:**
- Team members don't know what APIs exist
- Harder to discover functionality
- Duplicated work

**Action Items:**
- [ ] Explore `src/routes/` directory structure
- [ ] Create `docs/API.md` with all endpoints
- [ ] Document request/response formats
- [ ] Add example cURL commands

**Create `docs/API.md`:**

```markdown
# API Documentation

## Base URL

- **Development:** `http://localhost:5173`
- **Production:** `https://optimas-primeml.pages.dev`

## Routes

This project uses [TanStack Router](https://tanstack.com/router/latest) with file-based routing.

Routes are defined in `src/routes/` and auto-generated to `src/routeTree.gen.ts`.

### File-Based Routing Structure

```
src/routes/
├── __root.tsx          Root layout
├── index.tsx           / (homepage)
├── about.tsx           /about
├── api/
│   ├── health.ts       /api/health (server function)
│   └── submit.ts       /api/submit
└── projects/
    ├── index.tsx       /projects
    ├── $id.tsx         /projects/:id
    └── $id.edit.tsx    /projects/:id/edit
```

### Example Routes

#### GET `/` (Homepage)

Root page component.

```bash
curl http://localhost:5173/
```

#### Server Functions (RPC)

Server functions are defined in route files with `action` exports:

```typescript
// src/routes/api/submit.ts
export async function action({ request }) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  const data = await request.json();
  // Process data...
  return new Response(JSON.stringify({ success: true }));
}
```

Call from client:

```typescript
const response = await fetch('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* data */ })
});
```

## Authentication

Uses Supabase Auth via `@supabase/supabase-js`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

## Database Access

Query Supabase tables from server or client:

```typescript
// Client-side
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });

// Server-side (with RLS bypass)
const { data, error } = await supabase
  .from('projects')
  .select('*');
```

## Caching & Data Fetching

Uses [TanStack React Query](https://tanstack.com/query/latest):

```typescript
import { useQuery } from '@tanstack/react-query';

export function ProjectsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*');
      return data;
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data.map(project => (
        <li key={project.id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

## Error Handling

Server errors are caught and rendered as HTML error pages in `src/lib/error-page.ts`:

```typescript
// src/lib/error-page.ts
export function renderErrorPage(): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>500 - Internal Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
      </body>
    </html>
  `;
}
```

## Rate Limiting & Quotas

- **Supabase Free Tier:**
  - 500MB database storage
  - 1GB file storage
  - Unlimited API calls (fair use)
  - 2 concurrent connections

- **Cloudflare Pages:**
  - 100,000 requests/day (free tier)
  - 500 builds/month
  - Unlimited bandwidth

Upgrade plans if you hit limits.
```

---

## Low Priority / Nice-to-Have

These items improve developer experience but are not blockers.

### 10. Missing GitHub Actions Workflows

**Status:** 🔴 Not Started

**Recommended Workflows:**
- Lint on PR
- Type check on PR
- Build verification
- Deployment on merge to main

**Files to Create:**

**`.github/workflows/lint.yml`:**

```yaml
name: Lint

on:
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
```

**`.github/workflows/typecheck.yml`:**

```yaml
name: Type Check

on:
  pull_request:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx tsc --noEmit
```

---

### 11. Add JSDoc / TypeDoc Comments

**Status:** 🔴 Not Started

**Benefit:** Better IDE hints, auto-generated docs

**Example:**

```typescript
/**
 * Renders the error page HTML when an SSR error occurs
 * @returns {string} HTML string for 500 error page
 */
export function renderErrorPage(): string {
  return `...`;
}

/**
 * Normalizes catastrophic SSR responses from h3
 * @param {Response} response - The server response
 * @returns {Promise<Response>} Normalized response
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  // ...
}
```

---

### 12. Monorepo Readiness (Future)

**Status:** 🔴 Not Started

**When to consider:** If adding backend services or shared packages

**Option 1: npm workspaces**

```json
{
  "workspaces": [
    "packages/web",
    "packages/api",
    "packages/shared"
  ]
}
```

**Option 2: Bun workspaces**

```toml
# bunfig.toml
[install]
optional = true

[[workspaces]]
pattern = "packages/*"
```

---

## 🚀 Quick Wins (Do These First)

Complete these immediately to unblock other work:

```bash
# ============================================================================
# 1. Fix Security Issue: Remove .env from tracking
# ============================================================================
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
git rm --cached .env
git commit -m "security: remove .env from git tracking"
# Then rotate Supabase keys in dashboard

# ============================================================================
# 2. Create .env.example
# ============================================================================
cp .env .env.example
# Edit .env.example to remove actual values (see template above)
git add .env.example
git commit -m "docs: add .env.example template"

# ============================================================================
# 3. Update .gitignore completeness
# ============================================================================
cat >> .gitignore << 'EOF'
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
EOF

# ============================================================================
# 4. Commit all initial setup
# ============================================================================
git add .
git commit -m "chore: consolidate .gitignore and env setup"

# ============================================================================
# 5. Verify everything works
# ============================================================================
bun install
bun run build
```

---

## Hosting Recommendation

### 🥇 Best Choice: Cloudflare Pages + Workers

**Why:**
- ✅ Already configured in `vite.config.ts`
- ✅ Free tier: 100,000 requests/day
- ✅ Global edge deployment (300+ data centers)
- ✅ Zero cold starts
- ✅ Sub-100ms latency worldwide
- ✅ Built-in KV store for caching
- ✅ Perfect for TanStack Start + Nitro

**Cost:** Free to $20-50/month at scale

**Setup:** See [Section 2](#2-missing-production-deployment-configuration) above

### 🥈 Alternative: Vercel

**Pros:** Simple UI, great Next.js/React support  
**Cons:** Cold starts, more expensive at scale ($20-100/month)  
**When:** If you prefer managed deployment simplicity

### 🥉 Alternative: Railway / Fly.io

**Pros:** Good for backend-heavy apps  
**Cons:** Regional only, more ops overhead  
**When:** If adding Node.js backend services later

### ❌ Avoid: AWS Lambda

**Why:** 3-30s cold starts (kills SSR), complex setup, expensive

---

## Implementation Timeline

### Week 1: Security & Setup
- [ ] Item #1: Fix .env security
- [ ] Item #2: Deployment config
- [ ] Item #3: Database migrations
- [ ] Quick Wins section

### Week 2: Code Quality
- [ ] Item #4: TypeScript strict mode
- [ ] Item #7: ESLint tightening
- [ ] Item #5: Basic testing setup

### Week 3: Documentation & Testing
- [ ] Item #6: Package manager standardization
- [ ] Item #8: Environment documentation
- [ ] Item #9: API documentation
- [ ] Item #5: Full test suite + CI

### Week 4+: Polish & Optional
- [ ] Item #10: GitHub Actions workflows
- [ ] Item #11: JSDoc comments
- [ ] Item #12: Monorepo setup (if needed)
- [ ] Performance monitoring
- [ ] Analytics setup

---

## Checklist Template

Print or copy this to track progress:

```
CRITICAL / HIGH PRIORITY
- [ ] 1. Security: Fix .env exposure
- [ ] 2. Deployment configuration
- [ ] 3. Database migrations
- [ ] 4. TypeScript strict mode
- [ ] 5. Testing infrastructure

MEDIUM PRIORITY
- [ ] 6. Package manager consistency
- [ ] 7. ESLint tightening
- [ ] 8. Environment documentation
- [ ] 9. API documentation

LOW PRIORITY / NICE-TO-HAVE
- [ ] 10. GitHub Actions workflows
- [ ] 11. JSDoc comments
- [ ] 12. Monorepo readiness

DEPLOYMENT
- [ ] Set up Cloudflare Pages
- [ ] Configure CI/CD
- [ ] Monitor production
```

---

## Questions & Support

- **TypeScript help:** See [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- **Supabase help:** See [Supabase Docs](https://supabase.com/docs)
- **TanStack Start:** See [TanStack Router Docs](https://tanstack.com/router/latest)
- **Cloudflare:** See [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

---

**Last Updated:** 2026-07-14  
**Project:** OPTIMAS_PRIMEml  
**Status:** Ready for implementation
