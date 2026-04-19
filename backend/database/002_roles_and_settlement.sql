-- ============================================================
-- Migration: Roles and Settlement System
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add role column to room_members (if not exists)
ALTER TABLE IF EXISTS public.room_members
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
CHECK (role IN ('owner', 'member'));

-- 2. Add closed_at and status to rooms (if not exists)
ALTER TABLE IF EXISTS public.rooms
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
CHECK (status IN ('active', 'closed'));

-- Create index on room_members for faster role lookups
CREATE INDEX IF NOT EXISTS idx_room_members_role
  ON public.room_members (room_iban, role);
