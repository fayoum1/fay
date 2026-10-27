alter table public.site_settings
  add column if not exists hourly_reports_enabled boolean not null default true;
