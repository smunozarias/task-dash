-- Migration Script: Remove Unique Constraint from Activities Table
-- Execute this in your Supabase SQL Editor if you already created the table with the constraint

-- Drop the existing unique constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_unique_event;

-- Add created_at column if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Add delete policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activities' AND policyname = 'Allow public delete'
  ) THEN
    CREATE POLICY "Allow public delete" ON activities FOR DELETE USING (true);
  END IF;
END $$;
