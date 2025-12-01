# Database Migrations

This directory contains SQL migration files for setting up the database schema.

## Migration Files

1. **001_create_users_table.sql** - Creates users table
2. **002_create_subscriptions_table.sql** - Creates subscriptions table
3. **003_create_usage_table.sql** - Creates usage tracking table

## Running Migrations

### Option 1: Using psql (Supabase)

```bash
# Connect to Supabase database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run migrations in order
\i migrations/001_create_users_table.sql
\i migrations/002_create_subscriptions_table.sql
\i migrations/003_create_usage_table.sql
```

### Option 2: Using Node.js script

```bash
# Run all migrations
node scripts/run-migrations.js
```

### Option 3: Using Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file content
3. Run them in order

## Migration Order

Migrations must be run in order:
1. Users table (no dependencies)
2. Subscriptions table (depends on users)
3. Usage table (depends on users)

## Verifying Migrations

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'subscriptions', 'usage');

-- Check table structure
\d users
\d subscriptions
\d usage
```

## Rolling Back

To rollback a migration, you can manually drop the tables:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS usage CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

