-- ============================================================
-- Migration: Notification System Tables
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. room_invites
CREATE TABLE IF NOT EXISTS public.room_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_iban  text NOT NULL REFERENCES public.rooms(room_iban) ON DELETE CASCADE,
  invited_user_iban   text NOT NULL REFERENCES public.users(user_iban) ON DELETE CASCADE,
  invited_by_user_iban text NOT NULL REFERENCES public.users(user_iban) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

-- Prevent duplicate pending invites for the same (room, user)
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_invites_pending
  ON public.room_invites (room_iban, invited_user_iban)
  WHERE status = 'pending';

-- 2. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_iban  text NOT NULL REFERENCES public.users(user_iban) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  data       jsonb DEFAULT '{}'::jsonb,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications (user_iban, created_at DESC);

-- 3. user_friends
CREATE TABLE IF NOT EXISTS public.user_friends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_iban       text NOT NULL REFERENCES public.users(user_iban) ON DELETE CASCADE,
  friend_user_iban text NOT NULL REFERENCES public.users(user_iban) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_iban, friend_user_iban)
);
