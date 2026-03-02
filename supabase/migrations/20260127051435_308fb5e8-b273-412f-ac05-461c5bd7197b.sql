-- Create trigger function to automatically update course enrollment count
CREATE OR REPLACE FUNCTION public.update_course_enrollment_count()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.courses 
    SET enrolled_count = COALESCE(enrolled_count, 0) + 1 
    WHERE id = NEW.course_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.courses 
    SET enrolled_count = GREATEST(COALESCE(enrolled_count, 0) - 1, 0) 
    WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_enrollments table
DROP TRIGGER IF EXISTS maintain_enrollment_count ON public.user_enrollments;
CREATE TRIGGER maintain_enrollment_count
AFTER INSERT OR DELETE ON public.user_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_course_enrollment_count();