# Thesis Web App

A modern web application built with React, Vite, and Supabase.

## Features

- 🔐 Authentication (Email/Password + Magic Link)
- 📱 Responsive design
- 🎯 TypeScript for type safety
- 📝 **Thesis Check Records** (main feature):
    - Public read access: anyone can view records (no login required)
  - Upload, organize, and view markdown files by person (login required)
- 🧪 Testing setup with Vitest
- 🚀 Fast development with Vite

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create `.env` file from example:

```bash
cp .env.example .env
```

4. Update `.env` with your credentials:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup Database

Create the required tables in your Supabase database:

#### Demo Items Table (Optional)

```sql
create table demo_items (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table demo_items enable row level security;
create policy "Authenticated users can manage demo items"
  on demo_items for all
  using (auth.uid() is not null);
```

#### Thesis Check Records Table (Primary Feature)

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

Or apply all migrations using Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push supabase/migrations
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run db:push` | Push database changes (requires Supabase CLI) |

## Project Structure

```
├── src/
│   ├── components/    # React components
│   │   ├── Auth.tsx              # Authentication UI
│   │   └── ThesisCheckRecords.tsx # Thesis check records management (main feature)
│   ├── lib/           # Utilities
│   │   ├── supabase.ts           # Supabase client
│   │   └── database.types.ts     # TypeScript types
│   ├── test/          # Test files
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Entry point
├── supabase/
│   └── migrations/    # SQL migration files
├── index.html
├── vite.config.ts
└── package.json
```

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Testing**: Vitest + Testing Library

## License

MIT
