# Local Development Database Seeding

## Quick Start

```bash
# 1. Reset database (applies migrations)
cd apps/web
npx supabase db reset --yes

# 2. Create test users
npx tsx supabase/seed-users.ts

# 3. Create test events
npx tsx supabase/seed-events.ts
```

## Test Credentials

After seeding, you can log in with:

- **alice@example.com** / password123 (Base)
- **bob@example.com** / password123 (Flyer)
- **charlie@example.com** / password123 (Both, Super Admin)
- **diana@example.com** / password123 (Both)

## Why Two Steps?

Supabase GoTrue (authentication service) cannot verify passwords hashed with PostgreSQL's `crypt()` function, even when using the correct bcrypt cost factor.

**Root cause**: Subtle differences in bcrypt library implementations between PostgreSQL and GoTrue.

**Solution**: Use Supabase's Admin API (`auth.admin.createUser()`) to ensure passwords are hashed in a GoTrue-compatible format.

## What Gets Seeded

### Step 1: Database Reset
- Applies all migrations (schema, RLS policies, indexes)
- Creates empty tables ready for data

### Step 2: User Creation Script
- Creates 4 test users via Admin API
- Auto-creates profiles via database trigger
- Updates profiles with additional data (bio, city, role, etc.)
- Tests authentication to verify everything works

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

1. **Option A**: Create users first, then add SQL seed data
   - Update `supabase/seed.sql` with INSERT statements
   - Use actual user IDs from profiles table
   - Run `npx supabase db reset --yes`
   - Run `npx tsx supabase/seed-users.ts`

2. **Option B**: Create a separate seeding script
   - Similar to `seed-users.ts`
   - Uses Supabase client for type-safe inserts
   - Run after user seeding

## Files

- `supabase/seed.sql` - Run automatically during `db reset` (currently minimal)
- `supabase/seed-users.ts` - Creates test users via Admin API
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

# Create users
npx tsx supabase/seed-users.ts

# Verify
npx supabase status
```
