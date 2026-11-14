-- Livros — esquema da base de dados (Supabase / Postgres)
-- Executar uma vez em: Supabase → SQL Editor → New query → colar → Run.

create table if not exists public.books (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Dados do livro (copiados da Google Books / Open Library ou inseridos à mão)
  isbn13         text check (isbn13 is null or isbn13 ~ '^97[89][0-9]{10}$'),
  isbn10         text,
  title          text not null check (length(title) between 1 and 500),
  subtitle       text,
  authors        text[] not null default '{}',
  publisher      text,
  published_date text,
  page_count     integer check (page_count is null or page_count > 0),
  language       text,
  description    text,
  cover_url      text check (cover_url is null or length(cover_url) < 400000),
  source         text not null default 'manual' check (source in ('google', 'bnp', 'openlibrary', 'manual')),
  source_id      text,

  -- Dados pessoais de leitura
  status         text not null default 'want' check (status in ('want', 'reading', 'read')),
  rating         smallint check (rating between 1 and 5),
  started_at     date,
  finished_at    date,
  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Cada pessoa só pode ter o mesmo ISBN uma vez na sua estante.
create unique index if not exists books_user_isbn13_key
  on public.books (user_id, isbn13) where isbn13 is not null;

create index if not exists books_user_updated_idx on public.books (user_id, updated_at desc);

-- Atualiza updated_at automaticamente.
create or replace function public.books_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at
  before update on public.books
  for each row execute function public.books_touch_updated_at();

-- ---------------------------------------------------------------
-- Privacidade: Row Level Security.
-- Mesmo que alguém altere a app, a base de dados só devolve/aceita
-- linhas cujo user_id seja o do utilizador autenticado.
-- ---------------------------------------------------------------
alter table public.books enable row level security;

drop policy if exists "books_select_own" on public.books;
drop policy if exists "books_insert_own" on public.books;
drop policy if exists "books_update_own" on public.books;
drop policy if exists "books_delete_own" on public.books;

create policy "books_select_own" on public.books
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "books_insert_own" on public.books
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "books_update_own" on public.books
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "books_delete_own" on public.books
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Utilizadores anónimos não têm qualquer acesso.
revoke all on public.books from anon;
grant select, insert, update, delete on public.books to authenticated;

-- ---------------------------------------------------------------
-- Atualização (nov. 2026): nova fonte "bnp" (Biblioteca Nacional).
-- Para bases de dados criadas antes, basta correr este bloco.
-- ---------------------------------------------------------------
alter table public.books drop constraint if exists books_source_check;
alter table public.books add constraint books_source_check
  check (source in ('google', 'bnp', 'openlibrary', 'manual'));
