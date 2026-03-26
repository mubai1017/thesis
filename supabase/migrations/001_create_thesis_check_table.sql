-- Create thesis_check_records table
create table thesis_check_records (
  id uuid default gen_random_uuid() primary key,
  person_name text not null,
  file_name text not null unique,
  file_content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster queries by person_name and created_at
create index idx_thesis_check_records_person_name on thesis_check_records(person_name);
create index idx_thesis_check_records_created_at on thesis_check_records(created_at desc);

-- Enable Row Level Security
alter table thesis_check_records enable row level security;

-- Policy: Allow all operations for authenticated users
create policy "Authenticated users can manage thesis check records"
  on thesis_check_records for all
  using (auth.uid() is not null);

-- Policy: Allow public read access (optional, adjust as needed)
create policy "Public can view thesis check records"
  on thesis_check_records for select
  using (true);
