# Local Development Database Seeding

## Quick Start

```bash
# Reset database (applies migrations + seed.sql)
cd apps/web
npx supabase db reset --yes
```

## Test Credentials

After seeding, you can log in with:

- **alice@example.com** / password123 (Base)
- **bob@example.com** / password123 (Flyer)
- **charlie@example.com** / password123 (Both, Super Admin)
- **diana@example.com** / password123 (Both)

## Why One Step Now?

We moved all seeding into `supabase/seed.sql`, including:
- auth users (via `auth.users` + `auth.identities`)
- profiles
- events

This removes the manual TS scripts and keeps seeding consistent across resets.

## What Gets Seeded

### Step 1: Database Reset
- Applies all migrations (schema, RLS policies, indexes)
- Runs `supabase/seed.sql` to insert users, profiles, and events

## Troubleshooting

### "Invalid login credentials"

1. **Check Supabase is running:**
   ```bash
   npx supabase status
   ```
   Note the "Project URL" port number.

2. **Verify users exist:**
   - Open Supabase Studio: http://127.0.0.1:54323
   - Go to Authentication → Users
   - Should see 4 test users

3. **Check your frontend `.env` file matches the port:**
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54421
   VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
   ```

4. **If still failing, check GoTrue logs:**
   ```bash
   docker logs supabase_auth_fuddhnsjxumqhdquvchx 2>&1 | tail -50
   ```

### "Could not find the table 'public.profiles'"

This warning can be ignored. It appears because:
- Supabase caches the schema
- The profile table was just created
- The upsert still succeeds despite the warning

To verify profiles were created:
```bash
npx supabase db query "SELECT id, email, first_name, city FROM profiles;"
```

### Port Mismatch

The project uses **custom ports** (defined in `supabase/config.toml`):
- API: 54421
- DB: 54422
- Studio: 54423

If you see different ports, check your `config.toml` file.

## Adding More Test Data

To add events, participants, or other test data:
- Update `supabase/seed.sql` with additional INSERT statements
- Re-run `npx supabase db reset --yes`

## Files

- `supabase/seed.sql` - Run automatically during `db reset` (users, profiles, events)
- `SEEDING.md` - This file

## Complete Fresh Start

If you need to completely reset everything:

```bash
cd apps/web

# Stop Supabase
npx supabase stop --no-backup

# Start fresh
npx supabase start

# Reset database
npx supabase db reset --yes

# Verify
npx supabase status
```
