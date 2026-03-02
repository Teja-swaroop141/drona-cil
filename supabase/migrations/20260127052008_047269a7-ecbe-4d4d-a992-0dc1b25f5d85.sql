-- Add foreign key constraints to user-referencing tables for data integrity and GDPR compliance

-- First clean up any orphaned records that might exist
DELETE FROM public.quiz_attempts WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_module_progress WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_enrollments WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraint to quiz_attempts
ALTER TABLE public.quiz_attempts
ADD CONSTRAINT quiz_attempts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key constraint to user_module_progress
ALTER TABLE public.user_module_progress
ADD CONSTRAINT user_module_progress_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key constraint to user_enrollments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_enrollments_user_id_fkey' 
    AND table_name = 'user_enrollments'
  ) THEN
    ALTER TABLE public.user_enrollments
    ADD CONSTRAINT user_enrollments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Drop unused calculate_course_progress function (unused SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.calculate_course_progress(uuid, uuid);