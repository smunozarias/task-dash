-- Migration: add 'period' and 'is_demo' to activities
-- Run this in your Supabase SQL editor or as part of migrations

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS period TEXT;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Optional index to speed up queries by period
CREATE INDEX IF NOT EXISTS idx_activities_period ON public.activities (period);
