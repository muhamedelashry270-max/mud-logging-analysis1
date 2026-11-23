-- Private saved analyses. Guests calculate in-browser and do not write to this table.
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  well_name text not null default '',
  formation text not null default '',
  interval_label text not null default '',
  background_values numeric[] not null check (array_length(background_values, 1) = 5),
  measured_values numeric[] not null check (array_length(measured_values, 1) = 5),
  final_interpretation text not null default '',
  calculation_version text not null default 'workbook-transcription-0.2.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analyses_user_updated_idx
  on public.analyses (user_id, updated_at desc);

alter table public.analyses enable row level security;

create policy "Users can read their own analyses"
  on public.analyses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own analyses"
  on public.analyses for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own analyses"
  on public.analyses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own analyses"
  on public.analyses for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists analyses_set_updated_at on public.analyses;
create trigger analyses_set_updated_at
before update on public.analyses
for each row execute function public.set_updated_at();

revoke all on public.analyses from anon;
grant select, insert, update, delete on public.analyses to authenticated;
