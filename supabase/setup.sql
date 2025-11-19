-- ============================================
-- Supabase Setup Script for Vertex Time Grid
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  onboarding_completed boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create tasks table with updated constraints (1-3 scale) and category
-- Note: urgency, importance, and time_required are nullable to support unweighted tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  urgency integer check (urgency IS NULL OR (urgency >= 1 AND urgency <= 3)),
  importance integer check (importance IS NULL OR (importance >= 1 AND importance <= 3)),
  time_required integer check (time_required IS NULL OR (time_required >= 1 AND time_required <= 3)),
  category text,
  completed_at timestamp with time zone,
  "order" integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on tasks
alter table public.tasks enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own tasks" on public.tasks;
drop policy if exists "Users can create their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;

-- Tasks policies
create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can create their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Function to handle new user signup (with secure search_path)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer 
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to update updated_at timestamp (with secure search_path)
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Drop existing triggers if they exist
drop trigger if exists set_updated_at_profiles on public.profiles;
drop trigger if exists set_updated_at_tasks on public.tasks;

-- Triggers for updated_at
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_tasks
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- Add completed_at column if it doesn't exist (for existing databases)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'tasks' 
    and column_name = 'completed_at'
  ) then
    alter table public.tasks add column completed_at timestamp with time zone;
  end if;
end $$;

-- Migrate existing columns to allow nulls and update constraints (for existing databases)
do $$
declare
  constraint_name text;
begin
  -- Drop existing check constraints on urgency
  for constraint_name in 
    select conname from pg_constraint 
    where conrelid = 'public.tasks'::regclass 
    and contype = 'c' 
    and pg_get_constraintdef(oid) like '%urgency%'
  loop
    execute format('alter table public.tasks drop constraint if exists %I', constraint_name);
  end loop;
  
  -- Drop existing check constraints on importance
  for constraint_name in 
    select conname from pg_constraint 
    where conrelid = 'public.tasks'::regclass 
    and contype = 'c' 
    and pg_get_constraintdef(oid) like '%importance%'
  loop
    execute format('alter table public.tasks drop constraint if exists %I', constraint_name);
  end loop;
  
  -- Drop existing check constraints on time_required
  for constraint_name in 
    select conname from pg_constraint 
    where conrelid = 'public.tasks'::regclass 
    and contype = 'c' 
    and pg_get_constraintdef(oid) like '%time_required%'
  loop
    execute format('alter table public.tasks drop constraint if exists %I', constraint_name);
  end loop;
  
  -- Allow nulls on urgency, importance, and time_required columns
  alter table public.tasks alter column urgency drop not null;
  alter table public.tasks alter column importance drop not null;
  alter table public.tasks alter column time_required drop not null;
  
  -- Add new check constraints that allow nulls (only if they don't already exist)
  if not exists (
    select 1 from pg_constraint 
    where conrelid = 'public.tasks'::regclass 
    and conname = 'tasks_urgency_check'
  ) then
    alter table public.tasks add constraint tasks_urgency_check 
      check (urgency IS NULL OR (urgency >= 1 AND urgency <= 3));
  end if;
  
  if not exists (
    select 1 from pg_constraint 
    where conrelid = 'public.tasks'::regclass 
    and conname = 'tasks_importance_check'
  ) then
    alter table public.tasks add constraint tasks_importance_check 
      check (importance IS NULL OR (importance >= 1 AND importance <= 3));
  end if;
  
  if not exists (
    select 1 from pg_constraint 
    where conrelid = 'public.tasks'::regclass 
    and conname = 'tasks_time_required_check'
  ) then
    alter table public.tasks add constraint tasks_time_required_check 
      check (time_required IS NULL OR (time_required >= 1 AND time_required <= 3));
  end if;
end $$;

-- Add order column if it doesn't exist (for existing databases)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'tasks' 
    and column_name = 'order'
  ) then
    alter table public.tasks add column "order" integer;
    
    -- Set default order values for existing tasks based on created_at
    -- This ensures existing tasks have an order when the column is first added
    with ordered_tasks as (
      select id, row_number() over (partition by user_id order by created_at desc) as rn
      from public.tasks
      where "order" is null
    )
    update public.tasks t
    set "order" = ot.rn
    from ordered_tasks ot
    where t.id = ot.id;
  end if;
end $$;

-- Add status column if it doesn't exist (for existing databases)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'tasks' 
    and column_name = 'status'
  ) then
    alter table public.tasks add column status text default 'To-do' check (status in ('To-do', 'In Progress', 'On-hold', 'Done'));
    
    -- Set default status for existing tasks
    update public.tasks set status = 'To-do' where status is null;
    
    -- Make status not null after setting defaults
    alter table public.tasks alter column status set not null;
  end if;
end $$;

-- Add onboarding_completed column if it doesn't exist (for existing databases)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'profiles' 
    and column_name = 'onboarding_completed'
  ) then
    alter table public.profiles add column onboarding_completed boolean default false;
    
    -- Set default for existing profiles
    update public.profiles set onboarding_completed = false where onboarding_completed is null;
  end if;
end $$;

-- Add scheduled_at column if it doesn't exist (for existing databases)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'tasks' 
    and column_name = 'scheduled_at'
  ) then
    alter table public.tasks add column scheduled_at timestamp with time zone;
  end if;
end $$;

