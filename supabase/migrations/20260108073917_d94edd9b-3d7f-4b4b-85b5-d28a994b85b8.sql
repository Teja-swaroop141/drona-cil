-- Add new quiz configuration columns to course_modules
ALTER TABLE public.course_modules
ADD COLUMN allow_retries boolean DEFAULT true,
ADD COLUMN show_score_after_submission boolean DEFAULT true,
ADD COLUMN requires_passing boolean DEFAULT false;