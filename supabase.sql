-- Supabase の SQL Editor で実行(何度実行しても安全です)
-- 0) 先に Authentication > Providers > Email で「Confirm email」を有効にしてください

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 12),
  year text not null,
  cat text not null check (cat in ('ひとりごと','情報共有','質問')),
  body text not null check (char_length(body) <= 300),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  name text not null check (char_length(name) <= 12),
  year text not null,
  body text not null check (char_length(body) <= 300),
  is_best boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists tags (
  name text primary key check (char_length(name) <= 20)
);
alter table posts   add column if not exists solved  boolean not null default false;
alter table posts   add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete set null;
alter table answers add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete set null;

-- 1) 登録できるメールを大学ドメインに制限(shibaura-it.ac.jp のメールアドレスのみ許可)
create or replace function public.check_email_domain() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) !~ '(@|\.)shibaura-it\.ac\.jp$' then
    raise exception 'email domain not allowed';
  end if;
  return new;
end $$;
drop trigger if exists check_email_domain on auth.users;
create trigger check_email_domain before insert on auth.users
  for each row execute function public.check_email_domain();

-- 2) RLS: ログイン済みの人だけ読める。書き換えは持ち主だけ
alter table posts   enable row level security;
alter table answers enable row level security;
alter table tags    enable row level security;

drop policy if exists "posts read" on posts;   drop policy if exists "posts insert" on posts;   drop policy if exists "posts update" on posts;
drop policy if exists "answers read" on answers; drop policy if exists "answers insert" on answers; drop policy if exists "answers update" on answers;
drop policy if exists "tags read" on tags;     drop policy if exists "tags insert" on tags;
drop policy if exists posts_select on posts;   drop policy if exists posts_insert on posts;   drop policy if exists posts_update on posts;   drop policy if exists posts_delete on posts;
drop policy if exists answers_select on answers; drop policy if exists answers_insert on answers; drop policy if exists answers_update on answers; drop policy if exists answers_delete on answers;
drop policy if exists tags_select on tags;     drop policy if exists tags_insert on tags;

create policy posts_select on posts for select to authenticated using (true);
create policy posts_insert on posts for insert to authenticated with check (user_id = auth.uid());
create policy posts_update on posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy posts_delete on posts for delete to authenticated using (user_id = auth.uid());

create policy answers_select on answers for select to authenticated using (true);
create policy answers_insert on answers for insert to authenticated with check (user_id = auth.uid());
-- ベストアンサーの変更は「その質問を投稿した人」だけ
create policy answers_update on answers for update to authenticated
  using (exists (select 1 from posts p where p.id = answers.post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = answers.post_id and p.user_id = auth.uid()));
create policy answers_delete on answers for delete to authenticated using (user_id = auth.uid());

create policy tags_select on tags for select to authenticated using (true);
create policy tags_insert on tags for insert to authenticated with check (true);

-- 2.5) お気に入り(アカウントごとに保存)
create table if not exists favs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  primary key (user_id, post_id)
);
alter table favs enable row level security;
drop policy if exists favs_select on favs; drop policy if exists favs_insert on favs; drop policy if exists favs_delete on favs;
create policy favs_select on favs for select to authenticated using (user_id = auth.uid());
create policy favs_insert on favs for insert to authenticated with check (user_id = auth.uid());
create policy favs_delete on favs for delete to authenticated using (user_id = auth.uid());

-- 3) 未ログイン(anon)は一切アクセス不可。更新できる列も限定
revoke all on posts, answers, tags, favs from anon;
revoke update on posts, answers from authenticated;
grant update (solved) on posts to authenticated;
grant update (is_best) on answers to authenticated;

insert into tags(name) values ('新生活'),('手続き'),('自炊'),('ゴミ出し'),('入居前') on conflict do nothing;
