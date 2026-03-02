-- Add video_url column to course_roadmap_items table for storing video content
ALTER TABLE public.course_roadmap_items 
ADD COLUMN video_url TEXT;