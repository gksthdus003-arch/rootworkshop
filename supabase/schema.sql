-- Workshop Guide Supabase schema
-- Initial schema for Cloudflare Pages Functions + Supabase Postgres.
--
-- Notes:
-- - Do not expose the database directly to the frontend.
-- - Supabase Auth is intentionally not used in this first version.
-- - Cloudflare Pages Functions should use a server-side Supabase secret/service
--   role key or a direct database connection.
-- - RLS is enabled below as defense in depth. SQL Editor migrations/seeds run as
--   an owner/admin role and are not blocked by the lack of anon/authenticated
--   policies. Backend access with service_role also bypasses RLS.

create extension if not exists pgcrypto;

create table if not exists workshops (
  id text primary key,
  round integer not null check (round > 0),
  year integer not null check (year between 2000 and 2100),
  title text not null,
  subtitle text not null default '',
  period_label text not null default '',
  start_date date not null,
  status text not null default 'pre'
    check (status in ('pre', 'live', 'closed')),
  location_label text not null default '',
  preparation_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(preparation_items) = 'array'),
  venue_address text not null default '',
  transportation_guide text not null default '',
  map_link_url text,
  is_default boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workshops_one_default_idx
  on workshops (is_default)
  where is_default = true;

create table if not exists workshop_posters (
  workshop_id text primary key
    references workshops(id) on update cascade on delete cascade,
  enabled boolean not null default false,
  image_url text not null default '',
  version text not null default '',
  duration_ms integer not null default 2000 check (duration_ms >= 0),
  show_on_pre_first_visit boolean not null default true,
  show_on_day1_first_visit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists map_locations (
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  id text not null,
  name text not null,
  description text,
  category text not null
    check (category in ('meal', 'lodging', 'program', 'activity', 'gathering', 'other')),
  x_percent numeric(6, 3) not null check (x_percent >= 0 and x_percent <= 100),
  y_percent numeric(6, 3) not null check (y_percent >= 0 and y_percent <= 100),
  is_workshop_location boolean not null default false,
  is_smoking_area boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workshop_id, id)
);

create table if not exists schedule_items (
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  display_time text,
  start_at timestamptz,
  end_at timestamptz,
  location text not null default '',
  location_id text,
  category text not null
    check (category in ('orientation', 'session', 'break', 'meal', 'activity', 'event', 'free', 'notice')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workshop_id, id),
  constraint schedule_items_location_fkey
    foreign key (workshop_id, location_id)
    references map_locations(workshop_id, id)
    on update cascade
    on delete set null (location_id),
  constraint schedule_items_time_pair_chk
    check (
      (start_at is null and end_at is null)
      or
      (start_at is not null and end_at is not null and start_at <= end_at)
    ),
  constraint schedule_items_display_or_time_chk
    check (
      nullif(btrim(coalesce(display_time, '')), '') is not null
      or
      (start_at is not null and end_at is not null)
    )
);

create index if not exists schedule_items_workshop_sort_idx
  on schedule_items (workshop_id, sort_order, start_at);

create table if not exists schedule_controls (
  workshop_id text primary key
    references workshops(id) on update cascade on delete cascade,
  mode text not null default 'auto'
    check (mode in ('auto', 'manual')),
  manual_current_schedule_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_controls_manual_schedule_fkey
    foreign key (workshop_id, manual_current_schedule_id)
    references schedule_items(workshop_id, id)
    on update cascade
    on delete set null (manual_current_schedule_id),
  constraint schedule_controls_manual_item_required_chk
    check (
      mode = 'auto'
      or manual_current_schedule_id is not null
    )
);

create table if not exists events (
  id text primary key,
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  title text not null,
  description text not null default '',
  type text not null
    check (type in ('survey', 'event')),
  survey_kind text
    check (survey_kind in ('general', 'activity', 'transport', 'bowlingLevel')),
  event_kind text
    check (event_kind in ('general', 'bowling', 'preGuide')),
  show_in_event_list boolean not null default true,
  linked_survey_id text
    references events(id) on update cascade on delete set null,
  phase text
    check (phase in ('preSurvey', 'scoreInput', 'result')),
  page_background_image text,
  theme_image text,
  page_layout_type text,
  status text not null default 'waiting'
    check (status in ('active', 'waiting', 'closed')),
  opens_at timestamptz,
  closes_at timestamptz,
  requires_team_assignment boolean not null default false,
  result_summary text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_type_kind_chk
    check (
      (
        type = 'survey'
        and survey_kind is not null
        and event_kind is null
      )
      or
      (
        type = 'event'
        and event_kind is not null
        and survey_kind is null
      )
    ),
  constraint events_transport_hidden_chk
    check (
      survey_kind is distinct from 'transport'
      or show_in_event_list = false
    ),
  constraint events_open_close_order_chk
    check (
      opens_at is null
      or closes_at is null
      or opens_at < closes_at
    ),
  constraint events_linked_survey_not_self_chk
    check (
      linked_survey_id is null
      or linked_survey_id <> id
    ),
  unique (workshop_id, id)
);

create index if not exists events_workshop_list_idx
  on events (workshop_id, show_in_event_list, sort_order);

create index if not exists events_linked_survey_idx
  on events (linked_survey_id)
  where linked_survey_id is not null;

create table if not exists survey_questions (
  uid text primary key default gen_random_uuid()::text,
  event_id text not null
    references events(id) on update cascade on delete cascade,
  id text not null,
  type text not null
    check (type in ('description', 'singleChoice', 'multipleChoice', 'shortText')),
  label text not null,
  description text,
  required boolean not null default false,
  options_json jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, id),
  constraint survey_questions_options_array_chk
    check (jsonb_typeof(options_json) = 'array')
);

comment on column survey_questions.uid is
  'Internal row identifier for admin APIs. The id column remains the event-local answer key.';

comment on column survey_questions.id is
  'Event-local question key used in response answer payloads, e.g. targetScore.';

create index if not exists survey_questions_event_sort_idx
  on survey_questions (event_id, sort_order);

create table if not exists participants (
  id text primary key default gen_random_uuid()::text,
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participants_workshop_name_idx
  on participants (workshop_id, name);

create table if not exists event_teams (
  event_id text not null
    references events(id) on update cascade on delete cascade,
  id text not null,
  name text not null,
  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, id)
);

create index if not exists event_teams_event_sort_idx
  on event_teams (event_id, sort_order);

create table if not exists event_team_members (
  uid text primary key default gen_random_uuid()::text,
  event_id text not null,
  team_id text not null,
  participant_id text
    references participants(id) on update cascade on delete set null,
  participant_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_team_members_event_team_fkey
    foreign key (event_id, team_id)
    references event_teams(event_id, id)
    on update cascade
    on delete cascade,
  unique (event_id, participant_name)
);

create index if not exists event_team_members_lookup_idx
  on event_team_members (event_id, participant_name);

create table if not exists event_responses (
  id text primary key default gen_random_uuid()::text,
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  event_id text not null,
  participant_id text
    references participants(id) on update cascade on delete set null,
  participant_name text not null,
  assigned_team_id text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, id),
  constraint event_responses_workshop_event_fkey
    foreign key (workshop_id, event_id)
    references events(workshop_id, id)
    on update cascade
    on delete cascade,
  constraint event_responses_event_assigned_team_fkey
    foreign key (event_id, assigned_team_id)
    references event_teams(event_id, id)
    on update cascade
    on delete set null (assigned_team_id)
);

create index if not exists event_responses_event_submitted_idx
  on event_responses (event_id, submitted_at desc);

create index if not exists event_responses_participant_name_idx
  on event_responses (event_id, participant_name);

create table if not exists event_response_answers (
  response_id text not null,
  event_id text not null,
  question_id text not null,
  value_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (response_id, question_id),
  constraint event_response_answers_response_fkey
    foreign key (event_id, response_id)
    references event_responses(event_id, id)
    on update cascade
    on delete cascade,
  constraint event_response_answers_question_fkey
    foreign key (event_id, question_id)
    references survey_questions(event_id, id)
    on update cascade
    on delete restrict
);

create index if not exists event_response_answers_event_question_idx
  on event_response_answers (event_id, question_id);

create table if not exists bowling_scores (
  id text primary key default gen_random_uuid()::text,
  event_id text not null
    references events(id) on update cascade on delete cascade,
  participant_id text
    references participants(id) on update cascade on delete set null,
  participant_name text not null,
  game1_score integer check (game1_score is null or (game1_score >= 0 and game1_score <= 300)),
  game2_score integer check (game2_score is null or (game2_score >= 0 and game2_score <= 300)),
  memo text,
  entered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_name)
);

comment on table bowling_scores is
  'No team_id is stored here. Resolve team membership through event_team_members by event_id + participant_name.';

create index if not exists bowling_scores_event_participant_idx
  on bowling_scores (event_id, participant_name);

create table if not exists recommendations (
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  category text not null default '',
  location_label text not null default '',
  image_url text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workshop_id, id)
);

create index if not exists recommendations_workshop_visible_idx
  on recommendations (workshop_id, is_visible, sort_order);

create table if not exists announcements (
  workshop_id text not null
    references workshops(id) on update cascade on delete cascade,
  id text not null,
  title text not null,
  body text not null default '',
  is_important boolean not null default false,
  show_on_home_banner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workshop_id, id)
);

create index if not exists announcements_workshop_banner_idx
  on announcements (workshop_id, show_on_home_banner, created_at desc);

create table if not exists admin_settings (
  key text primary key,
  value_json jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'workshops',
    'workshop_posters',
    'map_locations',
    'schedule_items',
    'schedule_controls',
    'events',
    'survey_questions',
    'participants',
    'event_teams',
    'event_team_members',
    'event_responses',
    'event_response_answers',
    'bowling_scores',
    'recommendations',
    'announcements',
    'admin_settings'
  ]
  loop
    trigger_name := table_name || '_set_updated_at';

    if not exists (
      select 1
      from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('public.%I', table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function set_updated_at()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end;
$$;

create or replace function is_bowling_level_survey_event(p_event_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from events e
    where e.id = p_event_id
      and e.type = 'survey'
      and (
        e.survey_kind = 'bowlingLevel'
        or exists (
          select 1
          from events bowling_event
          where bowling_event.type = 'event'
            and bowling_event.event_kind = 'bowling'
            and bowling_event.linked_survey_id = e.id
        )
      )
  );
$$;

create or replace function protect_bowling_target_score_question()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.id = 'targetScore'
       and is_bowling_level_survey_event(old.event_id) then
      raise exception 'targetScore question cannot be deleted for bowling level survey';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.id = 'targetScore'
     and is_bowling_level_survey_event(old.event_id) then
    if new.id is distinct from old.id
       or new.event_id is distinct from old.event_id then
      raise exception 'targetScore question id and event_id cannot be changed';
    end if;

    if new.type <> 'shortText'
       or new.required is distinct from true
       or new.options_json is distinct from '[]'::jsonb then
      raise exception 'targetScore fixed fields cannot be changed';
    end if;
  end if;

  if new.id = 'targetScore'
     and is_bowling_level_survey_event(new.event_id) then
    if new.type <> 'shortText' then
      raise exception 'targetScore question type must be shortText';
    end if;

    if new.required is distinct from true then
      raise exception 'targetScore question must be required';
    end if;

    if new.options_json is distinct from '[]'::jsonb then
      raise exception 'targetScore question options_json must be []';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'survey_questions_protect_target_score'
      and tgrelid = 'public.survey_questions'::regclass
  ) then
    create trigger survey_questions_protect_target_score
    before insert or update or delete
    on survey_questions
    for each row
    execute function protect_bowling_target_score_question();
  end if;
end;
$$;

create or replace function validate_event_relationships()
returns trigger
language plpgsql
as $$
declare
  linked_event record;
begin
  if new.type = 'event' and new.event_kind = 'bowling' then
    if new.linked_survey_id is null then
      raise exception 'bowling event must have linked_survey_id';
    end if;

    select workshop_id, type, survey_kind
    into linked_event
    from events
    where id = new.linked_survey_id;

    if not found
       or linked_event.workshop_id <> new.workshop_id
       or linked_event.type <> 'survey'
       or linked_event.survey_kind <> 'bowlingLevel' then
      raise exception 'bowling event linked_survey_id must reference a bowlingLevel survey in the same workshop';
    end if;
  end if;

  if new.type = 'survey'
     and new.survey_kind is distinct from 'bowlingLevel'
     and exists (
       select 1
       from events e
       where e.type = 'event'
         and e.event_kind = 'bowling'
         and e.linked_survey_id = new.id
         and (tg_op = 'INSERT' or e.id <> new.id)
     ) then
    raise exception 'survey linked by a bowling event must remain bowlingLevel';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'events_validate_relationships'
      and tgrelid = 'public.events'::regclass
  ) then
    create trigger events_validate_relationships
    before insert or update
    on events
    for each row
    execute function validate_event_relationships();
  end if;
end;
$$;

create or replace function validate_bowling_score_event()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from events e
    where e.id = new.event_id
      and e.type = 'event'
      and e.event_kind = 'bowling'
  ) then
    raise exception 'bowling_scores.event_id must reference a bowling event';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'bowling_scores_validate_event'
      and tgrelid = 'public.bowling_scores'::regclass
  ) then
    create trigger bowling_scores_validate_event
    before insert or update
    on bowling_scores
    for each row
    execute function validate_bowling_score_event();
  end if;
end;
$$;

-- RLS first-pass setup.
-- No anon/authenticated policies are created because the browser must not access
-- these tables directly in v1. Use Cloudflare Pages Functions with server-side
-- credentials. Seed/migration scripts run through Supabase SQL Editor or a DB
-- owner connection are not blocked by these policies.
alter table workshops enable row level security;
alter table workshop_posters enable row level security;
alter table map_locations enable row level security;
alter table schedule_items enable row level security;
alter table schedule_controls enable row level security;
alter table events enable row level security;
alter table survey_questions enable row level security;
alter table participants enable row level security;
alter table event_teams enable row level security;
alter table event_team_members enable row level security;
alter table event_responses enable row level security;
alter table event_response_answers enable row level security;
alter table bowling_scores enable row level security;
alter table recommendations enable row level security;
alter table announcements enable row level security;
alter table admin_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all routines in schema public from anon, authenticated;

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all routines in schema public to service_role;
