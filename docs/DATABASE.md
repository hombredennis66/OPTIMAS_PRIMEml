# Database Schema

## Supabase Project

- **Project ID:** `wsxvnkejmqksmyoxpxuf`
- **Region:** Check your [Supabase Dashboard](https://app.supabase.com)

## Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `audit_logs` | Tracks all user actions for auditing | `action_type`, `target_type`, `target_id`, `details` (JSONB), `performed_by_id`, `created_at` |

> **Note:** Additional tables (users, projects, models) may exist in Supabase but are not yet tracked in migrations. Run `supabase db pull` to capture the full schema.

## Migration Files

Migrations are stored in two locations:

### `supabase/migrations/` (Supabase CLI managed)

These are the canonical migration files used by the Supabase CLI:

| File | Description |
|------|-------------|
| `20260714111838_*.sql` | Initial schema setup |
| `20260714111847_*.sql` | Schema additions |
| `20260714113254_*.sql` | Additional schema changes |
| `20260714152140_add_users_table.sql` | Users table |

### `migrations/` (Manual)

| File | Description |
|------|-------------|
| `20260714_create_audit_logs.sql` | Audit logs table with indexes |

## Running Migrations Locally

```bash
# Start local Supabase (requires Docker)
supabase start

# Apply pending migrations
supabase migration up

# Check migration status
supabase migration list
```

## Creating New Migrations

```bash
# Create a new migration file
supabase migration new describe_your_change

# Edit the generated file in supabase/migrations/
# Then apply it
supabase migration up
```

## Connecting to Local Postgres

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

## Pulling Schema from Remote

If the remote Supabase project has changes not tracked locally:

```bash
supabase link --project-ref wsxvnkejmqksmyoxpxuf
supabase db pull
git add supabase/migrations/
git commit -m "chore: sync database migrations from remote"
```
