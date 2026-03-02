-- Fix search_path for calculate_course_progress function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;