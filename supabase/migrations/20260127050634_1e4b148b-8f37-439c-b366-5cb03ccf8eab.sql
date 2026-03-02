-- Fix 1: Ensure contact_requests SELECT is admin-only (drop and recreate if exists)
DROP POLICY IF EXISTS "Admins can view all contact requests" ON public.contact_requests;

CREATE POLICY "Admins can view all contact requests" 
ON public.contact_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Quiz questions - Create a public view WITHOUT the correct_answer field
CREATE VIEW public.quiz_questions_public
WITH (security_invoker=on) AS
  SELECT 
    id, 
    module_id, 
    order_number, 
    question_text, 
    option_a, 
    option_b, 
    option_c, 
    option_d,
    created_at
  FROM public.quiz_questions;

-- Drop the existing public SELECT policy on quiz_questions
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;

-- Create restrictive policy: only admins can directly query the base table with answers
CREATE POLICY "Only admins can view quiz questions with answers"
ON public.quiz_questions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));