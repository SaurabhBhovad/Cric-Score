-- ============================================================
-- CRICKET SCOREBOARD — Supabase Schema
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_name text not null,
  team_color text default '#00D26A',
  created_at timestamptz default now()
);
alter table teams enable row level security;
create policy "teams_select" on teams for select using (auth.uid() = user_id);
create policy "teams_insert" on teams for insert with check (auth.uid() = user_id);
create policy "teams_update" on teams for update using (auth.uid() = user_id);
create policy "teams_delete" on teams for delete using (auth.uid() = user_id);

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null,
  batting_style text default 'Right Hand',
  bowling_style text default 'Right Arm Medium',
  jersey_number int,
  created_at timestamptz default now()
);
alter table players enable row level security;
create policy "players_select" on players for select using (auth.uid() = user_id);
create policy "players_insert" on players for insert with check (auth.uid() = user_id);
create policy "players_update" on players for update using (auth.uid() = user_id);
create policy "players_delete" on players for delete using (auth.uid() = user_id);

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table if not exists tournaments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  overs int not null default 20,
  format text default 'Round Robin',
  status text default 'active',
  created_at timestamptz default now()
);
alter table tournaments enable row level security;
create policy "tournaments_select" on tournaments for select using (auth.uid() = user_id);
create policy "tournaments_insert" on tournaments for insert with check (auth.uid() = user_id);
create policy "tournaments_update" on tournaments for update using (auth.uid() = user_id);
create policy "tournaments_delete" on tournaments for delete using (auth.uid() = user_id);

-- ============================================================
-- TOURNAMENT TEAMS (Junction)
-- ============================================================
create table if not exists tournament_teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  unique(tournament_id, team_id)
);
alter table tournament_teams enable row level security;
create policy "tt_select" on tournament_teams for select using (
  exists (select 1 from tournaments t where t.id = tournament_id and t.user_id = auth.uid())
);
create policy "tt_insert" on tournament_teams for insert with check (
  exists (select 1 from tournaments t where t.id = tournament_id and t.user_id = auth.uid())
);
create policy "tt_delete" on tournament_teams for delete using (
  exists (select 1 from tournaments t where t.id = tournament_id and t.user_id = auth.uid())
);

-- ============================================================
-- MATCHES
-- ============================================================
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete set null,
  team_a uuid not null references teams(id),
  team_b uuid not null references teams(id),
  overs int not null default 20,
  toss_winner uuid references teams(id),
  toss_choice text, -- 'bat' | 'bowl'
  status text default 'scheduled', -- scheduled | live | completed
  winner uuid references teams(id),
  result_text text,
  created_at timestamptz default now()
);
alter table matches enable row level security;
create policy "matches_select" on matches for select using (auth.uid() = user_id);
create policy "matches_insert" on matches for insert with check (auth.uid() = user_id);
create policy "matches_update" on matches for update using (auth.uid() = user_id);
create policy "matches_delete" on matches for delete using (auth.uid() = user_id);

-- ============================================================
-- MATCH PLAYERS (Playing XI)
-- ============================================================
create table if not exists match_players (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id),
  player_id uuid not null references players(id),
  unique(match_id, player_id)
);
alter table match_players enable row level security;
create policy "mp_select" on match_players for select using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "mp_insert" on match_players for insert with check (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "mp_delete" on match_players for delete using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);

-- ============================================================
-- INNINGS
-- ============================================================
create table if not exists innings (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  innings_number int not null, -- 1 or 2
  batting_team uuid not null references teams(id),
  bowling_team uuid not null references teams(id),
  runs int default 0,
  wickets int default 0,
  overs_bowled numeric(4,1) default 0,
  extras int default 0,
  wides int default 0,
  no_balls int default 0,
  byes int default 0,
  leg_byes int default 0,
  is_complete boolean default false,
  created_at timestamptz default now()
);
alter table innings enable row level security;
create policy "innings_select" on innings for select using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "innings_insert" on innings for insert with check (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "innings_update" on innings for update using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);

-- ============================================================
-- BALLS (Ball-by-Ball Data)
-- ============================================================
create table if not exists balls (
  id uuid primary key default uuid_generate_v4(),
  innings_id uuid not null references innings(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  over_number int not null,
  ball_number int not null, -- legal ball number in over (1-6)
  display_ball int not null, -- actual delivery including extras
  batsman_id uuid references players(id),
  bowler_id uuid references players(id),
  runs_off_bat int default 0,
  extra_runs int default 0,
  extra_type text, -- 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null
  is_wicket boolean default false,
  wicket_type text, -- 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket'
  fielder_id uuid references players(id),
  dismissed_batsman_id uuid references players(id),
  total_runs int default 0, -- runs_off_bat + extra_runs
  created_at timestamptz default now()
);
alter table balls enable row level security;
create policy "balls_select" on balls for select using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "balls_insert" on balls for insert with check (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "balls_delete" on balls for delete using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = auth.uid())
);
