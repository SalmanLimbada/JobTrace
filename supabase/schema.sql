-- Schema for Job Application Tracker
-- Run this in your Supabase project under: SQL Editor -> New query -> Run

create table if not exists applications (
  id text primary key,
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

-- Day 2 policies: Allow public access for anon client
create policy "Allow public read access" on applications
  for select using (true);

create policy "Allow public insert access" on applications
  for insert with check (true);

create policy "Allow public update access" on applications
  for update using (true);

create policy "Allow public delete access" on applications
  for delete using (true);
