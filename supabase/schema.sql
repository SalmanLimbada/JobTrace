-- Schema for Job Application Tracker
-- Run this in your Supabase project under: SQL Editor -> New query -> Run

create table if not exists applications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  status text not null check (status in ('Applied', 'Interview', 'Offer', 'Rejected', 'Other')),
  applied_date text not null,
  url text default '#',
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table applications enable row level security;

-- Drop previous permissive policies if they exist
drop policy if exists "Allow public read access" on applications;
drop policy if exists "Allow public insert access" on applications;
drop policy if exists "Allow public update access" on applications;
drop policy if exists "Allow public delete access" on applications;

-- Drop previous user policies if re-running
drop policy if exists "Users can read own applications" on applications;
drop policy if exists "Users can insert own applications" on applications;
drop policy if exists "Users can update own applications" on applications;
drop policy if exists "Users can delete own applications" on applications;

-- Strict user-scoped RLS policies
create policy "Users can read own applications" on applications
  for select using (auth.uid() = user_id);

create policy "Users can insert own applications" on applications
  for insert with check (auth.uid() = user_id);

create policy "Users can update own applications" on applications
  for update using (auth.uid() = user_id);

create policy "Users can delete own applications" on applications
  for delete using (auth.uid() = user_id);
