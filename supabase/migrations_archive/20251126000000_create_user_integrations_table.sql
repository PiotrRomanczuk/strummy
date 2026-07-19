
create table if not exists public.user_integrations (
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  access_token text,
  refresh_token text,
  expires_at bigint, -- Storing as timestamp in milliseconds from epoch
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, provider)
);

-- Enable RLS
alter table public.user_integrations enable row level security;

-- Create policies
create policy "Users can view their own integrations"
  on public.user_integrations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own integrations"
  on public.user_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own integrations"
  on public.user_integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own integrations"
  on public.user_integrations for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_updated_at before update on public.user_integrations
  for each row execute procedure update_updated_at_column();
