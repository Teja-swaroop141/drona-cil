-- Create storage bucket for course content (videos and images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-content', 'course-content', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view course content (public bucket)
CREATE POLICY "Public can view course content"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-content');

-- Only admins can upload course content
CREATE POLICY "Admins can upload course content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-content' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update course content
CREATE POLICY "Admins can update course content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-content' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete course content
CREATE POLICY "Admins can delete course content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-content' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Update RLS policies for courses table to allow admin management
CREATE POLICY "Admins can insert courses"
ON public.courses FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update courses"
ON public.courses FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for course_modules table
CREATE POLICY "Admins can insert modules"
ON public.course_modules FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update modules"
ON public.course_modules FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete modules"
ON public.course_modules FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for quiz_questions table  
CREATE POLICY "Admins can insert quiz questions"
ON public.quiz_questions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quiz questions"
ON public.quiz_questions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quiz questions"
ON public.quiz_questions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));