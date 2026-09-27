alter table public.limited_offers
  add column if not exists item_id bigint references public.items(id) on delete set null;

alter table public.limited_offers
  add column if not exists item_name text not null default '';

alter table public.limited_offers
  add column if not exists quantity_per_user integer not null default 1;

alter table public.limited_offers
  drop constraint if exists limited_offers_quantity_per_user_check;

alter table public.limited_offers
  add constraint limited_offers_quantity_per_user_check
  check (quantity_per_user > 0);

notify pgrst, 'reload schema';