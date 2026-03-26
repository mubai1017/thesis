# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **React + Vite web application** with **Supabase** as the backend database and authentication provider. The project includes:

- Frontend: React 19 + TypeScript + Vite 6
- Backend: Supabase (PostgreSQL + Auth)
- Testing: Vitest + React Testing Library
- Linting: ESLint

## Common Development Commands

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests (unit)
npm run test

# Run tests with UI
npm run test:ui

# Push local schema to Supabase (requires supabase CLI)
npm run db:push

# Open Supabase Studio dashboard
npm run db:studio
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials:
   - `VITE_SUPABASE_URL` - From Supabase project settings
   - `VITE_SUPABASE_ANON_KEY` - Public anon key from Supabase

3. Setup database table (see README.md for SQL)

## Architecture

### Frontend Structure

```
src/
├── components/          # React components with CSS modules
│   ├── Auth.tsx              # Login/signup/email magic link
│   └── ThesisCheckRecords.tsx # Thesis check records management (main feature)
├── lib/
│   ├── supabase.ts           # Supabase client singleton
│   └── database.types.ts     # TypeScript types for DB
├── test/
│   └── setup.ts              # Test setup
├── App.tsx                   # Main app (auth state management)
├── main.tsx                  # Entry point
└── index.css                 # Global styles
```

### State Management

- **Authentication**: Supabase Auth with `onAuthStateChange` listener
- **Data**: Local state with `useState`; fetch on auth change
- **No global state library** - simple React state for now

### Routing

No router currently implemented. The app uses conditional rendering based on `user` state:
- If `user` is null → show Auth component
- If `user` exists → show DemoTable component

## Key Files

- `src/lib/supabase.ts` - Initialize Supabase client
- `src/components/Auth.tsx` - Complete auth flow (signup/signin/magic link)
- `src/components/ThesisCheckRecords.tsx` - **Main feature**: Thesis check records management with markdown rendering
- `vite.config.ts` - Includes Vitest configuration for testing
- `.env.example` - Environment variable template
- `supabase/migrations/` - SQL migration files

## Database Schema

### thesis_check_records (Main Feature)

Stores markdown files for thesis checks, organized by person name. Records are grouped by `person_name` and sorted by `created_at` descending.

```sql
create table thesis_check_records (
  id uuid default gen_random_uuid() primary key,
  person_name text not null,
  file_name text not null unique,
  file_content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_thesis_check_records_person_name on thesis_check_records(person_name);
create index idx_thesis_check_records_created_at on thesis_check_records(created_at desc);

alter table thesis_check_records enable row level security;

create policy "Authenticated users can manage thesis check records"
  on thesis_check_records for all
  using (auth.uid() is not null);

create policy "Public can view thesis check records"
  on thesis_check_records for select
  using (true);
```

**Note**: The app auto-extracts `person_name` from filename using format: `姓名_论文检查_日期.md` (e.g., `陈钢_论文检查_20260324.md`).

## Testing

Tests use Vitest with jsdom environment. Place tests in `src/test/` or alongside files. Example pattern: `*.test.tsx`.

## Supabase MCP Server

The repository has Supabase MCP server enabled. Use it to:
- Execute SQL queries
- Manage database tables
- Deploy migrations
- View logs

## TypeScript Types

Generate full types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

Current `database.types.ts` is a placeholder.

## Notes

- Project uses React 19 (latest)
- Supabase v2 client
- No router yet - add if multi-page needed
- CSS uses plain CSS (no Tailwind or CSS-in-JS)
- Environment variables prefixed with `VITE_` are exposed to client

### Thesis Check Records Feature (Main Feature)

- Uses `react-markdown` for rendering markdown content
- Filename format: `姓名_论文检查_日期.md` (e.g., `陈钢_论文检查_20260324.md`)
- Auto-extracts person name from filename (before first `_`)
- Records grouped by person name, sorted by creation date (newest first)
- Click on a record to expand/collapse and view full markdown content
- Each file upload creates a new record (duplicate filenames not allowed)
- Records can be deleted individually (logged-in users only)
- Supports multiple historical records per person
- **Public read access**: Anyone (including guests) can view records
- **Upload/Delete**: Requires login (authenticated users only)

### Authentication & Authorization

- The app supports both authenticated and anonymous users
- Anonymous users can **view** all thesis check records (read-only)
- Logged-in users can **upload** new records and **delete** existing ones
- Login via email/password or magic link (email OTP)
- Compact login button in header for quick access

