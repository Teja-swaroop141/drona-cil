-- Add quiz-related columns to course_modules table
ALTER TABLE public.course_modules
ADD COLUMN has_quiz boolean DEFAULT false,
ADD COLUMN pass_percentage integer DEFAULT null,
ADD COLUMN total_questions integer DEFAULT null;