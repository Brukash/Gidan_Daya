-- Gidan Daya — content the secretariat publishes
--
-- The scheme's rate, fee and four dates were already columns on `scheme`; this
-- migration adds the site-visit details and the notice banner, and grants the
-- column updates the existing admin policies assume. Without those grants the
-- policies would have allowed the write but the role had no table privilege,
-- so the settings screen could not save in live mode.
--
-- Site visits are a date list because the cooperative schedules more than one
-- inspection; an empty list falls back to the issued dates in the app.

alter table public.scheme
  add column if not exists site_visit_dates date[] not null default '{}'::date[],
  add column if not exists site_visit_time text not null default '10:00 am',
  add column if not exists site_visit_meeting_point text not null default '',
  add column if not exists notice text not null default '';

alter table public.scheme
  add constraint scheme_notice_length check (char_length(notice) <= 240),
  add constraint scheme_site_visit_time_length check (char_length(site_visit_time) <= 40),
  add constraint scheme_site_visit_point_length check (char_length(site_visit_meeting_point) <= 200);

update public.scheme
set site_visit_dates = array['2026-11-28', '2026-12-05']::date[],
    site_visit_time = '10:00 am',
    site_visit_meeting_point =
      'The National Ecumenical Centre, opposite CBN Head Office back entrance, CBD, FCT Abuja'
where id = true
  and site_visit_dates = '{}'::date[];

-- RLS decides who may write; the grant decides whether the role may write at
-- all. Both are needed.
grant update (
  allocation_policy,
  name,
  price_per_sqm,
  application_fee,
  opens_on,
  closes_on,
  deposit_due_on,
  balance_due_on,
  site_visit_dates,
  site_visit_time,
  site_visit_meeting_point,
  notice
) on public.scheme to authenticated;

grant update (total_plots) on public.plot_tiers to authenticated;
