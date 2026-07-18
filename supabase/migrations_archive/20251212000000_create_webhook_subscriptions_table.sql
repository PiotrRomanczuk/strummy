create table if not exists public.webhook_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  channel_id text not null unique,
  resource_id text not null,
  expiration bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.webhook_subscriptions enable row level security;

create policy "Users can view their own webhook subscriptions"
  on public.webhook_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own webhook subscriptions"
  on public.webhook_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own webhook subscriptions"
  on public.webhook_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own webhook subscriptions"
  on public.webhook_subscriptions for delete
  using (auth.uid() = user_id);

create trigger handle_updated_at before update on public.webhook_subscriptions
  for each row execute procedure update_updated_at_column();
