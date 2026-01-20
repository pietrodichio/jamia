# Quick Start: Local Development with Supabase

## Setup (One-time)

1. **Copy the environment template**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Link to your production Supabase project** (to pull schema)
   ```bash
   npm run supabase:link
   ```
   
   You'll need your project reference ID. Find it in your Supabase dashboard URL:
   `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

3. **Pull your production database schema**
   ```bash
   supabase db pull
   ```
   
   This creates migration files in `supabase/migrations/`

## Daily Development Workflow

### 1. Start Local Supabase

```bash
npm run supabase:start
```

This will:
- Start PostgreSQL, PostgREST, GoTrue, and other services in Docker
- Display your local API credentials
- Make Supabase Studio available at `http://127.0.0.1:54323`

**First time may take a few minutes** as it downloads Docker images.

### 2. Apply Migrations (if you haven't yet or after pulling new changes)

```bash
npm run supabase:reset
```

This resets the database and applies all migrations from `supabase/migrations/`.

### 3. Start Your Application

```bash
npm run start:local
```

This runs your NestJS app with `NODE_ENV=local`, which loads `.env.local` instead of `.env`.

### 4. Access Supabase Studio

Visit `http://127.0.0.1:54323` to:
- Browse and edit data
- Run SQL queries
- Manage authentication users
- View logs and analytics

### 5. Stop Supabase When Done

```bash
npm run supabase:stop
```

## Useful Commands

### Check Supabase Status
```bash
npm run supabase:status
```

Shows all running services and their URLs/credentials.

### Reset Database (Fresh Start)
```bash
npm run supabase:reset
```

Wipes data and reapplies all migrations. Useful for testing migrations.

### Pull Latest Schema from Production
```bash
supabase db pull
npm run supabase:reset
```

Updates your local database to match production schema.

### Create a New Migration
```bash
supabase migration new your_migration_name
```

Creates a new empty migration file in `supabase/migrations/`.

### Generate TypeScript Types
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Generates TypeScript types based on your local database schema.

## Testing Features Locally

### Create Test Users

Use Supabase Studio (`http://127.0.0.1:54323`):
1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Set email and password

Or use SQL in Studio:
```sql
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"name": "Test User"}'::jsonb
);
```

### Seed Test Data

Create `supabase/seed.sql`:
```sql
-- Insert test profiles
INSERT INTO profiles (id, email, username) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com', 'testuser1'),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com', 'testuser2');

-- Insert test jams
INSERT INTO jams (name, description, manager_id) VALUES
  ('Test Jam', 'A test jam for local development', '11111111-1111-1111-1111-111111111111');
```

Then run:
```bash
npm run supabase:reset
```

The seed file runs automatically during reset.

### Test Telegram Integration

Option 1: Create a test bot with @BotFather
- Message @BotFather on Telegram
- Create a new bot: `/newbot`
- Copy the token to `.env.local`

Option 2: Use production bot (not recommended)
- Your local app will use the same bot as production
- Risk of mixing test and production data

## Troubleshooting

### Docker not running
```bash
# Start Docker Desktop or run:
open -a Docker
```

### Port conflicts
If ports 54321-54323 are in use:
```bash
npm run supabase:stop
# Then start again
npm run supabase:start
```

### Reset everything
```bash
npm run supabase:stop
supabase db reset
npm run supabase:start
```

### View logs
```bash
supabase logs
```

## Best Practices

1. **Always use `.env.local` for local development** - Never modify `.env`
2. **Commit migrations** - `supabase/migrations/*.sql` should be in git
3. **Use seed data** - Create `supabase/seed.sql` for consistent test data
4. **Test migrations locally first** - Run `npm run supabase:reset` before pushing
5. **Keep schema in sync** - Regularly pull from production with `supabase db pull`

## Next Steps

Once comfortable with local development:
1. Read `LOCAL_SUPABASE_SETUP.md` for advanced topics
2. Learn about [Supabase CLI](https://supabase.com/docs/guides/cli)
3. Set up CI/CD with migrations
