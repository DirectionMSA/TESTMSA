-- MSA V1 — Supabase
-- IMPORTANT : ce projet utilise un login applicatif username + mot de passe.
-- Les mots de passe sont hachés par pgcrypto. Ne stockez jamais un mot de passe en clair.

create extension if not exists pgcrypto;

create type public.user_role as enum ('direction','admin','agent');
create type public.request_status as enum ('pending','approved','rejected');

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text not null,
  password_hash text not null,
  role public.user_role not null default 'agent',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text not null,
  password_hash text not null,
  reason text,
  status public.request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  module text not null,
  can_view boolean not null default false,
  can_add boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  own_only boolean not null default false,
  unique(role,module)
);

create table if not exists public.mariages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.name_changes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.sanctions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.blacklist (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  event_date timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text,
  file_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  created_at timestamptz not null default now()
);

-- Fonctions de connexion / demande de compte.
create or replace function public.submit_account_request(
  p_username text, p_display_name text, p_password text, p_reason text default null
) returns void language plpgsql security definer set search_path=public,extensions as $$
begin
  if length(trim(p_username)) < 3 then raise exception 'Nom d''utilisateur trop court'; end if;
  if length(p_password) < 8 then raise exception 'Mot de passe trop court'; end if;
  if exists(select 1 from profiles where username=lower(trim(p_username))) then raise exception 'Ce nom d''utilisateur existe déjà'; end if;
  if exists(select 1 from account_requests where username=lower(trim(p_username)) and status='pending') then raise exception 'Une demande est déjà en attente'; end if;
  insert into account_requests(username,display_name,password_hash,reason)
  values(lower(trim(p_username)),trim(p_display_name),crypt(p_password,gen_salt('bf')),p_reason);
end $$;

create or replace function public.login_with_username(
  p_username text, p_password text
) returns table(id uuid, username text, display_name text, role text, role_name text)
language sql security definer set search_path=public,extensions as $$
  select p.id,p.username,p.display_name,p.role::text,p.role::text
  from profiles p
  where p.username=lower(trim(p_username))
    and p.active=true
    and p.password_hash=crypt(p_password,p.password_hash);
$$;

create or replace function public.review_account_request(
  p_request_id uuid, p_status request_status, p_reviewer_id uuid
) returns void language plpgsql security definer set search_path=public,extensions as $$
declare r account_requests%rowtype;
begin
  if not exists(select 1 from profiles where id=p_reviewer_id and role in ('direction','admin') and active=true) then
    raise exception 'Permission refusée';
  end if;
  select * into r from account_requests where id=p_request_id for update;
  if r.id is null then raise exception 'Demande introuvable'; end if;
  update account_requests set status=p_status,reviewed_by=p_reviewer_id,reviewed_at=now() where id=p_request_id;
  if p_status='approved' then
    if exists(select 1 from profiles where username=r.username) then raise exception 'Utilisateur déjà existant'; end if;
    insert into profiles(username,display_name,password_hash,role) values(r.username,r.display_name,r.password_hash,'agent');
  end if;
end $$;

-- Permissions de départ.
insert into permissions(role,module,can_view,can_add,can_edit,can_delete,own_only) values
('direction','*',true,true,true,true,false),
('admin','*',true,true,true,true,false),
('agent','mariages',true,true,false,false,false),
('agent','name_changes',true,true,false,false,false),
('agent','sanctions',true,true,false,false,false),
('agent','blacklist',true,true,false,false,false),
('agent','agenda',true,true,false,false,false),
('agent','documents',true,true,false,false,false)
on conflict(role,module) do nothing;

-- Crée le premier compte Direction.
-- CHANGEZ LE MOT DE PASSE AVANT D'EXECUTER CETTE REQUETE.
-- Remplacez les valeurs ci-dessous.
-- insert into profiles(username,display_name,password_hash,role)
-- values ('direction','Direction','VOTRE_HASH','direction');

-- Realtime.
alter table public.mariages replica identity full;
alter table public.name_changes replica identity full;
alter table public.sanctions replica identity full;
alter table public.blacklist replica identity full;
alter table public.agenda replica identity full;
alter table public.documents replica identity full;
alter table public.account_requests replica identity full;

-- Pour activer les changements Realtime dans Supabase, ajoutez les tables
-- nécessaires à la publication supabase_realtime depuis l'interface Database > Publications
-- ou utilisez :
-- alter publication supabase_realtime add table public.mariages;
-- etc.

-- NOTE DE SÉCURITÉ :
-- La V1 fournie ici est une base de démarrage. Pour une mise en production,
-- il est préférable de migrer l'authentification vers Supabase Auth ou un backend
-- avec sessions côté serveur, et d'ajouter des politiques RLS complètes.
