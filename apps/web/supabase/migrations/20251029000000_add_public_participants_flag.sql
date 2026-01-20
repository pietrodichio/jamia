-- Add flag to control public visibility of participants
alter table public.jams
add column if not exists public_participants boolean not null default true;

-- Ensure existing rows are set to true (in case of nulls from older rows)
update public.jams set public_participants = true where public_participants is null;


