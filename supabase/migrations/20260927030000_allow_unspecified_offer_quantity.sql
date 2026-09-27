alter table public.limited_offers
  alter column quantity_per_user drop not null;

alter table public.limited_offers
  alter column quantity_per_user drop default;

alter table public.limited_offers
  drop constraint if exists limited_offers_quantity_per_user_check;

alter table public.limited_offers
  add constraint limited_offers_quantity_per_user_check
  check (quantity_per_user is null or quantity_per_user > 0);

notify pgrst, 'reload schema';