-- Create table for storing activities
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_name text not null,
  type text not null,
  activity_date timestamp with time zone not null,
  hour integer
  
  -- Add constraints/indexes if needed
);

-- Enable Row Level Security (RLS)
alter table activities enable row level security;

-- Policy to allow anonymous read access (since this is a public dashboard for now)
create policy "Allow public read access"
  on activities for select
  to anon
  using (true);

-- Policy to allow anonymous insert access (for the sync feature)
create policy "Allow public insert access"
  on activities for insert
  to anon
  with check (true);

-- Policy to allow update logic (upsert)
create policy "Allow public update access"
  on activities for update
  to anon
  using (true);
