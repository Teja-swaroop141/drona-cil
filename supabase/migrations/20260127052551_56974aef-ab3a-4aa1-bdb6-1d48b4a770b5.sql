-- Fix quiz_questions_public view to allow authenticated users access
-- The view was created with security_invoker=on which inherits the admin-only RLS policy

-- Drop the existing view
DROP VIEW IF EXISTS public.quiz_questions_public;

-- Recreate without security_invoker (defaults to security_definer behavior)
-- This allows the view to bypass RLS on the base table while only exposing safe columns
CREATE VIEW public.quiz_questions_public AS
  SELECT id, module_id, order_number, question_text,
         option_a, option_b, option_c, option_d, created_at
  FROM public.quiz_questions;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.quiz_questions_public TO authenticated;

-- Also grant to anon for potential preview functionality (if needed)
GRANT SELECT ON public.quiz_questions_public TO anon;