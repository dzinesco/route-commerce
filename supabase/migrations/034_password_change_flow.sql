-- Migration: 034_password_change_flow
-- Adds must_change_password column to admin_users if not exists
-- Adds phone_number column to admin_users if not exists
-- Creates RPC to clear must_change_password after password update

alter table admin_users add column if not exists must_change_password boolean not null default false;
alter table admin_users add column if not exists phone_number text;

-- RPC: clear must_change_password for the authenticated user
create or replace function clear_must_change_password()
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update admin_users
  set must_change_password = false
  where user_id = auth.uid()
    and must_change_password = true;

  return true;
end;
$$;
