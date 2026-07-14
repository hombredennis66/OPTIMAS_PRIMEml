# API Documentation

## Base URL

- **Development:** `http://localhost:5173`
- **Production:** `https://optimas-primeml.pages.dev`

## Routes

This project uses [TanStack Router](https://tanstack.com/router/latest) with file-based routing. Routes are defined in `src/routes/` and auto-generated to `src/routeTree.gen.ts`.

### Route Map

| Route | File | Auth Required | Description |
|-------|------|:---:|-------------|
| `/` | `routes/index.tsx` | ❌ | Homepage / landing page |
| `/auth` | `routes/auth.tsx` | ❌ | Sign in / sign up |
| `/dashboard` | `routes/_authenticated/dashboard.tsx` | ✅ | User dashboard |
| `/admin` | `routes/_authenticated/admin.tsx` | ✅ | Admin panel |
| `/survey` | `routes/_authenticated/survey.tsx` | ✅ | Survey form |

### Route Layout Hierarchy

```
__root.tsx (global layout)
├── index.tsx (/)
├── auth.tsx (/auth)
└── _authenticated/route.tsx (auth guard)
    ├── dashboard.tsx (/dashboard)
    ├── admin.tsx (/admin)
    └── survey.tsx (/survey)
```

## Authentication

Uses Supabase Auth via `@supabase/supabase-js`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "secure-password",
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "secure-password",
});

// Get current user
const {
  data: { user },
} = await supabase.auth.getUser();
```

## Data Fetching

### TanStack React Query

All data fetching uses [TanStack React Query](https://tanstack.com/query/latest) for caching, deduplication, and background updates:

```typescript
import { useQuery } from "@tanstack/react-query";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
```

### Supabase Database

Query Supabase tables directly:

```typescript
// Select
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("column", "value");

// Insert
const { data, error } = await supabase
  .from("table_name")
  .insert({ column: "value" });

// Update
const { data, error } = await supabase
  .from("table_name")
  .update({ column: "new_value" })
  .eq("id", recordId);
```

## Audit Logging

The audit logger (`src/lib/auditLogger.ts`) tracks user actions:

```typescript
import { logAuditEvent } from "@/lib/auditLogger";

await logAuditEvent({
  action_type: "CREATE",
  target_type: "project",
  target_id: "project-123",
  details: { name: "New Project" },
  performed_by_id: user.id,
  performed_by_email: user.email,
});
```

## ML Predictions

Prediction utilities are in `src/lib/prediction.ts`. See the file for available functions and interfaces.

## Error Handling

### Server-Side (SSR)

The custom server entry (`src/server.ts`) wraps TanStack Start's default handler:

1. Catches unhandled errors during SSR
2. Detects h3 "swallowed" 500 responses (JSON `{unhandled: true}`)
3. Renders a user-friendly error page (`src/lib/error-page.ts`)

### Client-Side

Use React Query's built-in error handling:

```typescript
const { data, error, isError } = useQuery({...});

if (isError) {
  return <ErrorDisplay message={error.message} />;
}
```

## Rate Limits & Quotas

### Supabase (Free Tier)

| Resource | Limit |
|----------|-------|
| Database storage | 500 MB |
| File storage | 1 GB |
| API calls | Unlimited (fair use) |
| Concurrent connections | 2 |

### Cloudflare Pages (Free Tier)

| Resource | Limit |
|----------|-------|
| Requests/day | 100,000 |
| Builds/month | 500 |
| Bandwidth | Unlimited |

Upgrade plans as needed via [Supabase Pricing](https://supabase.com/pricing) or [Cloudflare Pricing](https://www.cloudflare.com/plans/).
