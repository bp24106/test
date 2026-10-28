-- Supabase の SQL Editor で実行
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 12),
  year text not null,
  cat text not null check (cat in ('ひとりごと','情報共有','質問')),
  body text not null check (char_length(body) <= 300),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists tags (
  name text primary key check (char_length(name) <= 20)
);
alter table posts enable row level security;
alter table tags  enable row level security;
create policy "posts read"   on posts for select using (true);
create policy "posts insert" on posts for insert with check (true);
create policy "tags read"    on tags  for select using (true);
create policy "tags insert"  on tags  for insert with check (true);
insert into tags(name) values ('新生活'),('手続き'),('自炊'),('ゴミ出し'),('入居前') on conflict do nothing;
