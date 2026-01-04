# Database Migration Guide: Health Card Vaccination Columns

## Issue
The database is missing the following columns in the `annual_health_cards` table:
- `vaccination_status` (text)
- `vaccinations` (jsonb, default: '{}')
- `allergies` (jsonb, default: '[]')

This causes the error: `column "vaccination_status" does not exist` when fetching health cards.

## Solution

### Step 1: Set up .env file
Create a `.env` file in the project root (copy from `.env.example`) and set the DATABASE_URL:

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/swasthya_track
```

### Step 2: Run the migration script
```bash
npx tsx script/addVaccinationColumns.ts
```

This script will:
1. Connect to your database using DATABASE_URL
2. Add the missing columns if they don't exist
3. Set default values for new columns

### Step 3: Verify migration
```bash
npx tsx script/checkSchema.ts
```

This will list all columns in the `annual_health_cards` table and confirm the vaccination columns exist.

### Step 4: Restart the server
Once the migration completes, restart your dev server:

```bash
npm run dev
```

The health cards list should now load without errors.

## Manual SQL Migration (alternative)

If you prefer to run SQL directly:

```sql
ALTER TABLE annual_health_cards
  ADD COLUMN IF NOT EXISTS vaccination_status text,
  ADD COLUMN IF NOT EXISTS vaccinations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allergies jsonb DEFAULT '[]'::jsonb;
```

Run this in your PostgreSQL client (psql, pgAdmin, etc.).

## Troubleshooting

- **"DATABASE_URL must be set"**: Ensure .env file exists and has DATABASE_URL configured
- **"column already exists"**: Migration is idempotent (uses `IF NOT EXISTS`), safe to re-run
- **Connection timeout**: Verify your database is running and DATABASE_URL is correct
