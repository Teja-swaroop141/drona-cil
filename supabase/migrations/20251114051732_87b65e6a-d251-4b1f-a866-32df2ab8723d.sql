-- Create course modules/lessons table
CREATE TABLE public.course_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_number integer NOT NULL,
  duration text NOT NULL,
  is_preview boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Anyone can view modules
CREATE POLICY "Anyone can view course modules"
ON public.course_modules FOR SELECT
USING (true);

-- Add some sample modules for each course
INSERT INTO public.course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT 
  c.id,
  'Introduction to ' || c.category,
  'Get started with the basics and understand the foundation of ' || c.category || ' language.',
  1,
  '45 min',
  true
FROM public.courses c;

INSERT INTO public.course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT 
  c.id,
  'Basic Grammar and Vocabulary',
  'Learn essential grammar rules and build your vocabulary foundation.',
  2,
  '1 hour',
  false
FROM public.courses c;

INSERT INTO public.course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT 
  c.id,
  'Reading and Writing Practice',
  'Practice reading comprehension and writing exercises to reinforce your learning.',
  3,
  '1.5 hours',
  false
FROM public.courses c;

INSERT INTO public.course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT 
  c.id,
  'Conversational Skills',
  'Develop practical speaking skills through interactive conversations and role-plays.',
  4,
  '1 hour',
  false
FROM public.courses c;

INSERT INTO public.course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT 
  c.id,
  'Cultural Context and Usage',
  'Understand the cultural nuances and appropriate usage in different contexts.',
  5,
  '1 hour',
  false
FROM public.courses c;

INSERT INTO public.course_modules (course_id, title, description, order_number, duration, is_preview)
SELECT 
  c.id,
  'Advanced Practice and Assessment',
  'Test your knowledge and practice advanced concepts through comprehensive exercises.',
  6,
  '2 hours',
  false
FROM public.courses c;