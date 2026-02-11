-- Migration: simplify activities table schema
-- Remove period and is_demo columns, keep it simple
-- This assumes you've already applied the previous migration

-- Remove the period column
ALTER TABLE public.activities DROP COLUMN IF EXISTS period;

-- Remove the is_demo column  
ALTER TABLE public.activities DROP COLUMN IF EXISTS is_demo;

-- Drop the old index on period
DROP INDEX IF EXISTS idx_activities_period;

-- Add a last_sync timestamp to track when data was uploaded
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP DEFAULT now();

-- Create an index on synced_at for efficient querying
CREATE INDEX IF NOT EXISTS idx_activities_synced_at ON public.activities (synced_at);
