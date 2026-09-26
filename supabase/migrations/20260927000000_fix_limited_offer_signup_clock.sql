create or replace function public.register_limited_offer_signup(
  p_offer_id bigint,
  p_name text,
  p_phone text,
  p_district text,
  p_village text,
  p_attachment_path text,
  p_attachment_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_offer public.limited_offers%rowtype;
  assigned_code text;
  remaining_count integer;
  registration_time timestamptz := now();
begin
  select * into selected_offer
  from public.limited_offers
  where id = p_offer_id
  for update;

  if not found or selected_offer.status <> 'active'
    or (selected_offer.starts_at is not null and selected_offer.starts_at > registration_time)
    or (selected_offer.ends_at is not null and selected_offer.ends_at < registration_time) then
    raise exception 'العرض غير متاح للتسجيل الآن';
  end if;

  if not (p_district = any(selected_offer.allowed_districts)) then
    raise exception 'المركز المحدد غير متاح لهذا العرض';
  end if;

  if selected_offer.max_recipients is not null
    and selected_offer.next_code_number > selected_offer.max_recipients then
    raise exception 'اكتمل العدد المتاح لهذا العرض';
  end if;

  assigned_code := selected_offer.code_prefix || selected_offer.next_code_number::text;

  insert into public.limited_offer_signups (
    offer_id, code, name, phone, district, village, attachment_path, attachment_name
  ) values (
    p_offer_id, assigned_code, p_name, p_phone, p_district, nullif(trim(p_village), ''), p_attachment_path, p_attachment_name
  );

  update public.limited_offers
  set next_code_number = next_code_number + 1, updated_at = registration_time
  where id = p_offer_id;

  remaining_count := case
    when selected_offer.max_recipients is null then -1
    else greatest(0, selected_offer.max_recipients - selected_offer.next_code_number)
  end;

  return jsonb_build_object('code', assigned_code, 'remaining', remaining_count);
end;
$$;

revoke all on function public.register_limited_offer_signup(bigint, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_limited_offer_signup(bigint, text, text, text, text, text, text) to service_role;

notify pgrst, 'reload schema';