-- ==============================================================================
-- HealthTrack: Production Supabase Schema & Row-Level Security (RLS)
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Reports Table
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  lab_name text,
  report_date date not null,
  uploaded_at bigint not null,
  status text not null default 'active' check (status in ('active', 'undone')),
  pdf_storage_path text,
  parse_warnings jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_reports_date on public.reports(report_date desc);
create index if not exists idx_reports_updated_at on public.reports(updated_at desc);

-- 3. Create Results Table
create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references public.reports(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  metric_key text not null,
  display_name text not null,
  value numeric not null,
  unit text not null,
  ref_low numeric,
  ref_high numeric,
  flag text not null check (flag in ('normal', 'low', 'high', 'borderline')),
  category text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_results_report_id on public.results(report_id);
create index if not exists idx_results_user_metric on public.results(user_id, metric_key);

-- 4. Enable Row Level Security (RLS)
alter table public.reports enable row level security;
alter table public.results enable row level security;

-- Reports Policies
create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reports"
  on public.reports for update
  using (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);

-- Results Policies
create policy "Users can view own results"
  on public.results for select
  using (auth.uid() = user_id);

create policy "Users can insert own results"
  on public.results for insert
  with check (auth.uid() = user_id);

create policy "Users can update own results"
  on public.results for update
  using (auth.uid() = user_id);

create policy "Users can delete own results"
  on public.results for delete
  using (auth.uid() = user_id);

-- 5. Storage Bucket for Private Original PDFs
insert into storage.buckets (id, name, public)
values ('healthtrack-reports', 'healthtrack-reports', false)
on conflict (id) do nothing;

create policy "Users can view own report PDFs"
  on storage.objects for select
  using (bucket_id = 'healthtrack-reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own report PDFs"
  on storage.objects for insert
  with check (bucket_id = 'healthtrack-reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own report PDFs"
  on storage.objects for update
  using (bucket_id = 'healthtrack-reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own report PDFs"
  on storage.objects for delete
  using (bucket_id = 'healthtrack-reports' and (storage.foldername(name))[1] = auth.uid()::text);
