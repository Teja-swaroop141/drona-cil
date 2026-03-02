-- Replace security definer view with a security definer function
-- This is the recommended pattern per Supabase docs

-- Drop the problematic view
DROP VIEW IF EXISTS public.quiz_questions_public;

-- Create a security definer function instead
CREATE OR REPLACE FUNCTION public.get_quiz_questions(p_module_id uuid)
RETURNS TABLE (
  id uuid,
  module_id uuid,
  order_number integer,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, module_id, order_number, question_text,
         option_a, option_b, option_c, option_d, created_at
  FROM public.quiz_questions
  WHERE module_id = p_module_id
  ORDER BY order_number;
$$;

-- Grant execute to authenticated users only (not anon)
GRANT EXECUTE ON FUNCTION public.get_quiz_questions(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_quiz_questions(uuid) IS 
'Returns quiz questions for a module WITHOUT exposing correct_answer. Used by Quiz component. NEVER return correct_answer from this function.';