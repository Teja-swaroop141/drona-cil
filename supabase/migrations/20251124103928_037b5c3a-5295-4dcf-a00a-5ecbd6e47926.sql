-- Add video_url column to course_modules
ALTER TABLE public.course_modules 
ADD COLUMN video_url text;

-- Create table to track user progress on individual modules
CREATE TABLE public.user_module_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.user_module_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user_module_progress
CREATE POLICY "Users can view their own module progress"
ON public.user_module_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own module progress"
ON public.user_module_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module progress"
ON public.user_module_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Add some YouTube video URLs to modules (20 min videos)
-- Getting modules from different courses
UPDATE public.course_modules
SET video_url = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
WHERE order_number = 1 AND course_id IN (
  SELECT id FROM public.courses LIMIT 1
);

UPDATE public.course_modules
SET video_url = 'https://www.youtube.com/embed/jNQXAC9IVRw'
WHERE order_number = 2 AND course_id IN (
  SELECT id FROM public.courses LIMIT 1
);

UPDATE public.course_modules
SET video_url = 'https://www.youtube.com/embed/9bZkp7q19f0'
WHERE order_number = 1 AND course_id IN (
  SELECT id FROM public.courses OFFSET 1 LIMIT 1
);

UPDATE public.course_modules
SET video_url = 'https://www.youtube.com/embed/L_LUpnjgPso'
WHERE order_number = 2 AND course_id IN (
  SELECT id FROM public.courses OFFSET 1 LIMIT 1
);

UPDATE public.course_modules
SET video_url = 'https://www.youtube.com/embed/kJQP7kiw5Fk'
WHERE order_number = 1 AND course_id IN (
  SELECT id FROM public.courses OFFSET 2 LIMIT 1
);

-- Function to calculate course progress
CREATE OR REPLACE FUNCTION calculate_course_progress(p_user_id uuid, p_course_id uuid)
RETURNS integer AS $$
DECLARE
  total_modules integer;
  completed_modules integer;
  progress_percentage integer;
BEGIN
  -- Get total modules for the course
  SELECT COUNT(*) INTO total_modules
  FROM public.course_modules
  WHERE course_id = p_course_id;
  
  -- Get completed modules for the user
  SELECT COUNT(*) INTO completed_modules
  FROM public.user_module_progress ump
  JOIN public.course_modules cm ON ump.module_id = cm.id
  WHERE ump.user_id = p_user_id 
    AND cm.course_id = p_course_id 
    AND ump.completed = true;
  
  -- Calculate percentage
  IF total_modules > 0 THEN
    progress_percentage := ROUND((completed_modules::numeric / total_modules::numeric) * 100);
  ELSE
    progress_percentage := 0;
  END IF;
  
  RETURN progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;