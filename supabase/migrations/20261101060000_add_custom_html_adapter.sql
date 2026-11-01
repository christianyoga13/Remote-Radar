-- Migration: 20261101060000_add_custom_html_adapter.sql
-- Description: Allow custom_html adapter in companies.ats check constraint

alter table companies drop constraint if exists companies_ats_check;
alter table companies add constraint companies_ats_check
  check (ats in (
    'greenhouse',
    'lever',
    'ashby',
    'workable',
    'smartrecruiters',
    'recruitee',
    'remotive',
    'arbeitnow',
    'custom_html'
  ));
