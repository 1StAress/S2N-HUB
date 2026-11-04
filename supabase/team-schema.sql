-- S2N HUB TEAM SYSTEM
-- Requires existing public.s2n_members
-- s2n_members.user_id must reference auth.users.id

create table if not exists public.s2n_teams (
  id uuid primary key default gen_random_uuid(),

  team_name text not null,
  team_tag text not null,
  game text not null default 'PUBG MOBILE',
  description text default '',

  leader_id uuid not null
    references auth.users(id) on delete restrict,

  status text not null default 'active'
    check (status in ('active', 'inactive')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint s2n_teams_tag_unique unique (team_tag)
);

create table if not exists public.s2n_team_members (
  id uuid primary key default gen_random_uuid(),

  team_id uuid not null
    references public.s2n_teams(id) on delete cascade,

  user_id uuid
    references auth.users(id) on delete set null,

  pubg_name text not null,

  role text not null
    check (role in ('leader', 'main', 'substitute')),

  position integer,

  created_at timestamptz not null default now(),

  constraint s2n_team_member_position_unique
    unique (team_id, position)
);

create index if not exists idx_s2n_team_members_team
on public.s2n_team_members(team_id);

create index if not exists idx_s2n_team_members_user
on public.s2n_team_members(user_id);

create index if not exists idx_s2n_teams_leader
on public.s2n_teams(leader_id);

alter table public.s2n_teams enable row level security;
alter table public.s2n_team_members enable row level security;

-- Teams: authenticated users can read
create policy "s2n_teams_read_authenticated"
on public.s2n_teams
for select
to authenticated
using (true);

-- Only the authenticated leader can create a team
create policy "s2n_teams_insert_leader"
on public.s2n_teams
for insert
to authenticated
with check (leader_id = auth.uid());

-- Only the current leader can update their team
create policy "s2n_teams_update_leader"
on public.s2n_teams
for update
to authenticated
using (leader_id = auth.uid())
with check (leader_id = auth.uid());

-- Team members: authenticated users can read
create policy "s2n_team_members_read_authenticated"
on public.s2n_team_members
for select
to authenticated
using (true);

-- Only the leader can add members to their own team
create policy "s2n_team_members_insert_leader"
on public.s2n_team_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.s2n_teams t
    where t.id = team_id
      and t.leader_id = auth.uid()
  )
);

-- Only the leader can delete members from their own team
create policy "s2n_team_members_delete_leader"
on public.s2n_team_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.s2n_teams t
    where t.id = team_id
      and t.leader_id = auth.uid()
  )
);



create or replace function public.s2n_create_team(
  p_team_name text,
  p_team_tag text,
  p_description text,
  p_leader_name text,
  p_player_1 text,
  p_player_2 text,
  p_player_3 text,
  p_substitute text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(p_team_name)) < 2 then
    raise exception 'Team name is too short';
  end if;

  if length(trim(p_team_tag)) < 2
     or length(trim(p_team_tag)) > 6 then
    raise exception 'Invalid team tag';
  end if;

  insert into public.s2n_teams (
    team_name,
    team_tag,
    description,
    leader_id
  )
  values (
    trim(p_team_name),
    upper(trim(p_team_tag)),
    coalesce(trim(p_description), ''),
    v_user_id
  )
  returning id into v_team_id;

  insert into public.s2n_team_members (
    team_id,
    user_id,
    pubg_name,
    role,
    position
  )
  values
    (
      v_team_id,
      v_user_id,
      trim(p_leader_name),
      'leader',
      0
    ),
    (
      v_team_id,
      null,
      trim(p_player_1),
      'main',
      1
    ),
    (
      v_team_id,
      null,
      trim(p_player_2),
      'main',
      2
    ),
    (
      v_team_id,
      null,
      trim(p_player_3),
      'main',
      3
    );

  if nullif(trim(p_substitute), '') is not null then
    insert into public.s2n_team_members (
      team_id,
      user_id,
      pubg_name,
      role,
      position
    )
    values (
      v_team_id,
      null,
      trim(p_substitute),
      'substitute',
      4
    );
  end if;

  return v_team_id;
end;
$$;

revoke all on function public.s2n_create_team(
  text, text, text, text, text, text, text, text
) from public;

grant execute on function public.s2n_create_team(
  text, text, text, text, text, text, text, text
) to authenticated;